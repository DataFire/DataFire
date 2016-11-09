let fs = require('fs');
let request = require('request');
let chalk = require('chalk');

let logger = require('../lib/logger');
let datafire = require('../index');

const FILE_SUFFIX = '.openapi.json';
const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const LOCAL_SPECS_DIR = __dirname + '/../integration_files';
const LOCAL_SPECS = fs.readdirSync(LOCAL_SPECS_DIR).map(f => f.substring(0, f.length - FILE_SUFFIX.length));

module.exports = (args) => {
  fs.mkdir('./integrations', (err) => {
    if (args.url) {
      integrateURL(args.as || args.integration, args.url);
    } else {
      if (LOCAL_SPECS.indexOf(args.integration) !== -1) return integrateFile(args.integration);
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

let integrateFile = (name) => {
  let filename = LOCAL_SPECS_DIR + '/' + name + FILE_SUFFIX;
  fs.readFile(filename, 'utf8', (err, data) => {
    if (err) throw err;
    let outFilename = datafire.integrationsDirectory + '/' + name + FILE_SUFFIX;
    fs.writeFileSync(outFilename, data);
  });
}

let integrateURL = (name, url) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    let filename = datafire.integrationsDirectory + '/' + name + FILE_SUFFIX;
    logger.log('Creating integration ' + filename.replace(process.cwd(), '.'));
    fs.writeFileSync(filename, JSON.stringify(body, null, 2));
  })
}

