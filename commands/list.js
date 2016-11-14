const fs = require('fs');
const path = require('path');
const request = require('request');
const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../lib/logger');

const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const NATIVE_INTEGRATIONS_DIR = path.join(__dirname, '..', 'native_integrations');

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
          if (api.info.title) logger.log(chalk.blue(api.info.title));
          logger.logDescription(api.info.description);
        } else {
          let integration = datafire.Integration.new(k);
          if (integration.spec.info.title) logger.log(chalk.blue(integration.spec.info.title));
          logger.logDescription(integration.spec.info.description);
        }
        logger.log();
      });
    });
  } else {
    fs.readdir(datafire.integrationsDirectory, (err, files) => {
      if (err) throw err;
      files.map(getNameFromFilename).forEach(name => {
        logger.log(chalk.magenta(name));
      })
    })
  }
}

