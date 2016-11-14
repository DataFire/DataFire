const fs = require('fs');
const ObjectId = require('mongodb').ObjectId;

const datafire = require('../index');

const flow = module.exports = new datafire.Flow('convertToV2', "Converts a v1 flow to v2");
const mongo = datafire.Integration.new('mongodb').as('dfread2');

flow.setDefaults({
  flow_id: '',
});

const convertName = (key) => {
  key = key.substring(key.indexOf(':') + 1);
  key = key.replace(/^www./, '');
  key = key.replace(/\.(com|net|org|gov)$/, '');
  return key.replace(/\W/g, '_');
}

const convertScript = (script, links) => {
  script = script.replace(/^[\s\S]*function\s+request\s*\(\s*(.*)\s*\)\s*\{/, '($1) => {');
  script = script.replace(/data\[(\d+)\]/g, (match, dataIdx) => {
    let link = links[+dataIdx];
    return 'data.' + link.name;
  })
  return script.split('\n').join('\n  ');
}

const getV2Code = (v1, links) => {
  links.forEach(l => l.name = convertName(l.key));
  let code = `

const datafire = require('../index.js');
const flow = module.exports = new datafire.Flow("${v1.title}", "${v1.description || ''}");
`
  let integrated = [];
  links.forEach(link => {
    if (integrated.indexOf(link._id) !== -1) return;
    integrated.push(link._id);
    code += `const ${link.name} = datafire.Integration.new('${link.name}')\n`
  });

  let extraCode = v1.links
      .map(l => l.script)
      .map(script => {
        return script.match(/^([\s\S]*)function\s+request/);
      })
      .filter(m => m && m[1])
      .map(m => m[1])
      .filter(m => m)
      .join('\n');
  extraCode = extraCode.split('\n').filter(line => !line.startsWith('//')).join('\n');
  code += extraCode.trim();

  v1.links.forEach((l, idx) => {
    let link = links[idx];
    code += `
flow.step('${link.name}', {
  do: ${link.name}.${l.operation.method}("${l.operation.path}"),
  params: ${convertScript(l.script, links)}
})
`
  })
  return code.trim();
}

flow
  .step('flow_v1', {
    do: mongo.findOne('chains'),
    params: data => {
      return {
        query: {_id: ObjectId(flow.params.flow_id)}
      }
    }
  })
  .step('links', {
    do: mongo.findOne('connections'),
    params: data => {
      return data.flow_v1.links.map(l => ({
        query: {_id: ObjectId(l.connection)},
      }))
    }
  })
  .step('write', {
    do: data => {
      fs.writeFileSync('./flow-v2.js', getV2Code(data.flow_v1, data.links))
    }
  })
