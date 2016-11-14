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
        let api = body[k];
        if (api) {
          api = api.versions[api.preferred];
          if (args.query && !integrationMatchesQuery(k, api, args.query)) return;
          logger.logIntegration(k, api);
        } else {
          let integration = datafire.Integration.new(k);
          if (args.query && !integrationMatchesQuery(k, integration.spec, args.query)) return;
          logger.logIntegration(k, integration.spec);
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

const integrationMatchesQuery = (name, spec, query) => {
  let searchText = name;
  let info = spec.info;
  if (info.title) searchText += info.title;
  if (info.description) searchText += info.description;
  searchText = searchText.toLowerCase();
  query = query.toLowerCase();
  return searchText.indexOf(query) !== -1;
}
