const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../lib/logger');

let RESTIntegration = require('../lib/rest-integration');

module.exports = (args) => {
  let integration = datafire.Integration.new(args.integration);
  integration.initialize(err => {
    if (err) throw err;
    let spec = integration.spec;
    logger.log();
    if (!args.operation) {
      logger.log(chalk.blue(spec.info.title));
      if (integration instanceof RESTIntegration) {
        let url = spec.schemes[0] + '://' + spec.host + spec.basePath;
        logger.log(chalk.blue(url));
      }
      logger.logDescription(spec.info.description);
      logger.log();
      for (let opName in integration.spec.operations) {
        let op = integration.spec.operations[opName];
        if (args.query && !operationMatchesQuery(opName, op, args.query)) continue;
        logger.logOperation(opName, op);
        logger.log();
      }
    } else {
      let operation = integration.getOperationDetails(args.operation);
      let opName = '';
      for (let opId in integration.spec.operations) {
        if (integration.spec.operations[opId] === operation) {
          opName = opId;
        }
      }
      logger.logOperation(opName, operation);
      logger.log();
      logger.logParameters(operation.parameters);
      logger.log();
      if (operation.response && operation.response.schema) {
        logger.log('\nResponse body')
        logger.logSchema(operation.response.schema);
      }
      logger.log();
    }
  });
}

let operationMatchesQuery = (name, op, q) => {
  q = q.toLowerCase();
  let searchText = name + '\n';
  if (op.description) searchText += op.description + '\n';
  if (op.summary) searchText += op.summary + '\n';
  if (op.path) searchText += op.path + '\n';
  if (op.method) searchText += op.method + '\n';
  searchText = searchText.toLowerCase();
  return searchText.indexOf(q) !== -1;
}
