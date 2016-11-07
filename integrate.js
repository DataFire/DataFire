let fs = require('fs');
let request = require('request');
let datafire = require('./index');

const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";

let integrate = module.exports = (name, cb) => {
  cb = cb || ((err) => {if (err) throw err});

  if (name.match(/^https?:/)) {
    integrateURL('', name, cb);
  } else {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) throw err;
      let keys = Object.keys(body);
      let validKeys = keys.filter(k => k.indexOf(name) !== -1);
      if (validKeys.length === 0) throw new Error("API " + name + " not found");
      if (validKeys.length > 1) throw new Error("Ambiguous API name: " + name + "\n\nPlease choose one of:\n" + validKeys.join('\n'));
      let info = body[validKeys[0]];
      let url = info.versions[info.preferred].swaggerUrl;
      integrateURL(name, url, cb);
    })
  }
}

let integrateURL = (name, url, cb) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    fs.writeFile(datafire.integrationsDirectory + '/' + name + '.openapi.json', JSON.stringify(body, null, 2), cb);
  })
}
