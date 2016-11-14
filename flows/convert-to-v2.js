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

const convertScript = (script) => {
  script = script.replace(/function\s+request\s*\(\s*(.*)\s*\)\s*\{/, '($1) => {');
  return script.split('\n').join('\n  ');
}

const getV2Code = (v1, links) => {
  let code = `

const datafire = require('../index.js');
const flow = module.exports = new datafire.Flow("${v1.title}", "${v1.description || ''}");
`
  let integrated = [];
  links.forEach(link => {
    if (integrated.indexOf(link.id) !== -1) return;
    integrated.push(link.id);
    let name = convertName(link.key);
    code += `const ${name} = datafire.Integration.new('${name}')\n`
  })
  v1.links.forEach((l, idx) => {
    let link = links[idx];
    let name = convertName(link.key);
    code += `
flow.step('${name}', {
  do: ${name}.${l.operation.method}("${l.operation.path}"),
  params: ${convertScript(l.script)}
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
      console.log(data.links);
      fs.writeFileSync('./flow-v2.js', getV2Code(data.flow_v1, data.links))
    }
  })
