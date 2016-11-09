let fs = require('fs');
let request = require('request');
let chalk = require('chalk');

let logger = require('../lib/logger');
let datafire = require('../index');

const OPENAPI_SUFFIX = '.openapi.json';
const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const NATIVE_INTEGRATIONS_DIR = __dirname + '/../native_integrations';
const NATIVE_INTEGRATIONS = fs.readdirSync(NATIVE_INTEGRATIONS_DIR);

module.exports = (args) => {
  fs.mkdir('./integrations', (err) => {
    if (args.url) {
      integrateURL(args.as || args.integration, args.url);
    } else {
      if (getLocalSpec(args.integration)) return integrateFile(args.integration);
      request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
        if (err) throw err;
        let keys = Object.keys(body);
        let validKeys = keys.filter(k => k.indexOf(args.integration) !== -1);
        if (validKeys.length === 0) throw new Error("API " + args.integration + " not found");
        let exactMatch = validKeys.filter(f => f === args.integration)[0];
        if (validKeys.length > 1 && !exactMatch) {
          throw new Error("Ambiguous API name: " + args.integration + "\n\nPlease choose one of:\n" + validKeys.join('\n'));
        }
        let info = body[exactMatch || validKeys[0]];
        let url = info.versions[info.preferred].swaggerUrl;
        integrateURL(args.as || args.integration, url);
      })
    }
  })
}

let getLocalSpec = (name) => {
  return NATIVE_INTEGRATIONS.filter(fname => fname.startsWith(name + '.'))[0];
}

let integrateFile = (name) => {
  let filename = getLocalSpec(name);
  if (!filename) throw new Error("Integration " + name + " not found");
  fs.readFile(NATIVE_INTEGRATIONS_DIR + '/' + filename, 'utf8', (err, data) => {
    if (err) throw err;
    let outFilename = datafire.integrationsDirectory + '/' + filename;
    logger.log('Creating integration ' + outFilename.replace(process.cwd(), '.'));
    fs.writeFileSync(outFilename, data);
  });
}

let integrateURL = (name, url) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    let filename = datafire.integrationsDirectory + '/' + name + OPENAPI_SUFFIX;
    logger.log('Creating integration ' + filename.replace(process.cwd(), '.'));
    fs.writeFileSync(filename, JSON.stringify(body, null, 2));
  })
}

