'use strict';

var chalk = require('chalk');
var datafire = require('../index');
var logger = require('../lib/logger');

var RESTIntegration = require('../lib/rest-integration');

module.exports = function (args) {
  var integration = datafire.Integration.new(args.integration);
  integration.initialize(function (err) {
    if (err) throw err;
    var spec = integration.spec;
    logger.log();
    if (!args.operation) {
      logger.log(chalk.blue(spec.info.title));
      if (integration instanceof RESTIntegration) {
        var url = spec.schemes[0] + '://' + spec.host + spec.basePath;
        logger.log(chalk.blue(url));
      }
      logger.logDescription(spec.info.description);
      logger.log();
      for (var opName in integration.spec.operations) {
        var op = integration.spec.operations[opName];
        if (args.query && !operationMatchesQuery(opName, op, args.query)) continue;
        logger.logOperation(opName, op);
        logger.log();
      }
    } else {
      var operation = integration.getOperationDetails(args.operation);
      var _opName = '';
      for (var opId in integration.spec.operations) {
        if (integration.spec.operations[opId] === operation) {
          _opName = opId;
        }
      }
      logger.logOperation(_opName, operation);
      logger.log();
      logger.logParameters(operation.parameters);
      logger.log();
      logger.logResponse(operation.response);
      logger.log();
    }
  });
};

var operationMatchesQuery = function operationMatchesQuery(name, op, q) {
  q = q.toLowerCase();
  var searchText = name + '\n';
  if (op.description) searchText += op.description + '\n';
  if (op.summary) searchText += op.summary + '\n';
  if (op.path) searchText += op.path + '\n';
  if (op.method) searchText += op.method + '\n';
  searchText = searchText.toLowerCase();
  return searchText.indexOf(q) !== -1;
};