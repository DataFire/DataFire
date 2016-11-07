let fs = require('fs');
let request = require('request');
let datafire = require('./index');

const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const FILE_SUFFIX = '.openapi.json';

let integrations = module.exports = {};

integrations.integrate = (args, cb) => {
  cb = cb || ((err) => {if (err) throw err});

  if (args.url) {
    integrateURL(args.name, args.url, cb);
  } else {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) return cb(err);
      let keys = Object.keys(body);
      let validKeys = keys.filter(k => k.indexOf(args.name) !== -1);
      if (validKeys.length === 0) cb(new Error("API " + args.name + " not found"));
      if (validKeys.length > 1) cb(new Error("Ambiguous API name: " + args.name + "\n\nPlease choose one of:\n" + validKeys.join('\n')));
      let info = body[validKeys[0]];
      let url = info.versions[info.preferred].swaggerUrl;
      integrateURL(args.name, url, cb);
    })
  }
}

let integrateURL = (name, url, cb) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    fs.writeFile(datafire.integrationsDirectory + '/' + name + FILE_SUFFIX, JSON.stringify(body, null, 2), cb);
  })
}

integrations.list = (args, cb) => {
  cb = cb || ((err, data) => {
    if (err) throw err;
    console.log(data.join("\n"));
  })
  if (args.all) {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) return cb(err);
      let keys = Object.keys(body);
      cb(null, keys);
    });
  } else {
    fs.readdir(datafire.integrationsDirectory, (err, files) => {
      if (err) return cb(err);
      cb(null, files.map(f => f.substring(0, f.length - FILE_SUFFIX.length)))
    })
  }
}

integrations.describe = (args) => {
  let integration = new datafire.Integration(args.name);
  integration.initialize(err => {
    let spec = integration.spec;
    Object.keys(spec.paths).forEach(path => {
      Object.keys(spec.paths[path]).forEach(method => {
        console.log(method.toUpperCase() + '\t' + path);
      });
    });
  });
}
