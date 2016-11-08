const fs = require('fs');
const request = require('request');
const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../lib/logger');

const FILE_SUFFIX = '.openapi.json';
const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const LOCAL_SPECS_DIR = __dirname + '/../integration_files';
const LOCAL_SPECS = fs.readdirSync(LOCAL_SPECS_DIR).map(f => f.substring(0, f.length - FILE_SUFFIX.length));

module.exports = (args) => {
  if (args.all) {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) throw err;
      let keys = Object.keys(body).concat(LOCAL_SPECS).sort();
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
      files.forEach(f => {
        let name = f.substring(0, f.length - FILE_SUFFIX.length);
        logger.log(chalk.magenta(name));
      })
    })
  }
}

