'use strict';

var fs = require('fs');
var path = require('path');
var request = require('request');
var chalk = require('chalk');
var datafire = require('../index');
var logger = require('../lib/logger');

var APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
var NATIVE_INTEGRATIONS_DIR = path.join(__dirname, '..', 'native_integrations');

var getNameFromFilename = function getNameFromFilename(f) {
  return f.substring(0, f.indexOf('.'));
};

var NATIVE_INTEGRATIONS = fs.readdirSync(NATIVE_INTEGRATIONS_DIR).map(getNameFromFilename);

module.exports = function (args) {
  if (args.all) {
    request.get(APIS_GURU_URL, { json: true }, function (err, resp, body) {
      if (err) throw err;
      var keys = Object.keys(body).concat(NATIVE_INTEGRATIONS).sort();
      keys.forEach(function (k) {
        var api = body[k];
        if (api) {
          api = api.versions[api.preferred];
          if (args.query && !integrationMatchesQuery(k, api, args.query)) return;
          logger.logIntegration(k, api);
        } else {
          var integration = datafire.Integration.new(k);
          if (args.query && !integrationMatchesQuery(k, integration.spec, args.query)) return;
          logger.logIntegration(k, integration.spec);
        }
        logger.log();
      });
    });
  } else {
    fs.readdir(datafire.integrationsDirectory, function (err, files) {
      if (err) throw err;
      files.map(getNameFromFilename).forEach(function (name) {
        logger.log(chalk.magenta(name));
      });
    });
  }
};

var integrationMatchesQuery = function integrationMatchesQuery(name, spec, query) {
  var searchText = name;
  var info = spec.info;
  if (info.title) searchText += info.title;
  if (info.description) searchText += info.description;
  searchText = searchText.toLowerCase();
  query = query.toLowerCase();
  return searchText.indexOf(query) !== -1;
};