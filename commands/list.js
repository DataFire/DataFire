const fs = require('fs');
const request = require('request');
const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../lib/logger');

const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const NATIVE_INTEGRATIONS_DIR = __dirname + '/../native_integrations';

let getNameFromFilename = f => f.substring(0, f.indexOf('.'));

const NATIVE_INTEGRATIONS = fs.readdirSync(NATIVE_INTEGRATIONS_DIR).map(getNameFromFilename);

module.exports = (args) => {
  if (args.all) {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) throw err;
      let keys = Object.keys(body).concat(NATIVE_INTEGRATIONS).sort();
      keys.forEach(k => {
        logger.log(chalk.magenta(k));
        let api = body[k];
        if (api) {
          api = api.versions[api.preferred];
          logger.logDescription(api.info.description);
        }
        logger.log();
      });
    });
  } else {
    fs.readdir(datafire.integrationsDirectory, (err, files) => {
      if (err) return cb(err);
      files.map(getNameFromFilename).forEach(name => {
        logger.log(chalk.magenta(name));
      })
    })
  }
}

