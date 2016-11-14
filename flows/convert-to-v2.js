const fs = require('fs');
const path = require('path');
const async = require('async');
const ObjectId = require('mongodb').ObjectId;

const datafire = require('../index');

const flow = module.exports = new datafire.Flow('convertToV2', "Converts a v1 flow to v2");
const mongo = datafire.Integration.new('mongodb').as('dfread2');

flow.setDefaults({
  flow_id: '',
  out_dir: './flow-v2.js',
});

const unescapeString = function(str) {
  return str.replace(/\\u0024/g, '$').replace(/\\u002E/g, '.');
}

const unescapeKeys = function(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  var out = {}, o, k;
  for (var key in obj) {
    o = obj[key];
    k = unescapeString(key);
    if (Array.isArray(o)) {
      out[k] = o.map(function(inner) {return unescapeKeys(inner, unescapeString)});
    } else if (typeof o === 'object') {
      out[k] = unescapeKeys(o, unescapeString);
    } else {
      out[k] = o;
    }
  }
  return out;
};

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
    return 'data.' + link.step_name;
  });
  script = script.replace(/constants\./g, 'flow.params.');
  return script.split('\n').join('\n  ');
}

const getV2Code = (v1, links) => {
  links.forEach(l => l.name = convertName(l.key));
  links.forEach((link1, idx1) => {
    link1.step_name = link1.name;
    let stepNum = 0;
    links.forEach((link2, idx2) => {
      if (idx2 >= idx1) return;
      if (link2.name === link1.name) ++stepNum;
    })
    if (stepNum) link1.step_name += stepNum;
  })
  let code = `

const datafire = require('datafire');
const flow = module.exports = new datafire.Flow("${v1.title}", "${v1.description || ''}");
`
  let integrated = [];
  links.forEach(link => {
    if (integrated.indexOf(link.name) !== -1) return;
    integrated.push(link.name);
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
flow.step('${link.step_name}', {
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
    },
    finish: data => {
      data.links.forEach(l => l.swagger = unescapeKeys(l.swagger));
    }
  })
  .step('write', {
    do: data => {
      fs.writeFileSync(path.join(flow.params.out_dir, 'flow.js'), getV2Code(data.flow_v1, data.links))
      let integrationsDir = path.join(flow.params.out_dir, 'integrations');
      try {
        fs.mkdirSync(integrationsDir);
      } catch (e) {}
      data.links.forEach(l => {
        fs.writeFileSync(path.join(integrationsDir, l.name + '.openapi.json'), JSON.stringify(l.swagger, null, 2));
      })
    }
  })
