const fs = require('fs');
const path = require('path');
const request = require('request');
const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../util/logger');

const INTEGRATION_LOCATIONS = [
  path.join(process.cwd(), 'integrations'),
  path.join(process.cwd(), 'node_modules', '@datafire'),
  '@datafire',
];

const INTEGRATION_LIST_URL = "https://raw.githubusercontent.com/DataFire/Integrations/master/json/list.json";
const getAllIntegrations =  (callback) => {
  if (process.env.DATAFIRE_REGISTRY_DIR) {
    let list = require(process.env.DATAFIRE_REGISTRY_DIR + '/list.json');
    callback(null, list);
  } else {
    request.get(INTEGRATION_LIST_URL, {json: true}, (err, resp, body) => {
      callback(err, body);
    })
  }
}

module.exports = (args) => {
  return new Promise((resolve, reject) => {
    if (args.all) {
      getAllIntegrations((err, list) => {
        if (err) return reject(err);
        let keys = Object.keys(list);
        keys.forEach(k => {
          let api = list[k];
          if (args.query && !integrationMatchesQuery(k, api, args.query)) return;
          logger.logIntegration(k, {info: api});
          logger.log();
        });
        resolve();
      });
    } else {
      INTEGRATION_LOCATIONS.forEach(dir => {
        fs.readdir(dir, (err, dirs) => {
          if (err) {
            if (err.code === 'ENOENT') return;
            return reject(err);
          }
          dirs.forEach(name => {
            logger.log(chalk.magenta(name));
          })
          resolve();
        })
      });
    }
  });
}

const integrationMatchesQuery = (name, info, query) => {
  let searchText = name;
  if (info.title) searchText += info.title;
  if (info.description) searchText += info.description;
  searchText = searchText.toLowerCase();
  query = query.toLowerCase();
  return searchText.indexOf(query) !== -1;
}
