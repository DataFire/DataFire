let fs = require('fs');
let request = require('request');
let chalk = require('chalk');

let logger = require('../lib/logger');
let datafire = require('../index');

const FILE_SUFFIX = '.openapi.json';
const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";

module.exports = (args) => {
  fs.mkdir('./integrations', (err) => {
    if (args.url) {
      integrateURL(args.as || args.name, args.url);
    } else {
      if (args.name === 'hacker_news') return integrateFile(args.name, __dirname + '/integration_files/hacker_news.openapi.json');
      request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
        if (err) throw err;
        let keys = Object.keys(body);
        let validKeys = keys.filter(k => k.indexOf(args.name) !== -1);
        if (validKeys.length === 0) throw new Error("API " + args.name + " not found");
        let exactMatch = validKeys.filter(f => f === args.name)[0];
        if (validKeys.length > 1 && !exactMatch) throw new Error("Ambiguous API name: " + args.name + "\n\nPlease choose one of:\n" + validKeys.join('\n'));
        let info = body[exactMatch || validKeys[0]];
        let url = info.versions[info.preferred].swaggerUrl;
        integrateURL(args.as || args.name, url);
      })
    }
  })
}

let integrateFile = (name, filename) => {
  fs.readFile(filename, 'utf8', (err, data) => {
    if (err) return cb(err);
    let outFilename = datafire.integrationsDirectory + '/' + name + FILE_SUFFIX;
    fs.writeFile(outFilename, data, (err) => {
      if (err) throw err;
    });
  });
}

let integrateURL = (name, url, cb) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    let filename = datafire.integrationsDirectory + '/' + name + FILE_SUFFIX;
    logger.log('Creating integration ' + filename.replace(process.cwd(), '.'));
    fs.writeFile(filename, JSON.stringify(body, null, 2), cb);
  })
}

