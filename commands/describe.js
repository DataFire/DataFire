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
      for (let opName in integration.operations) {
        logger.logOperation(integration.operations[opName], true);
        logger.log();
      }
    } else {
      let operation = integration.resolveOperation(args.operation);
      logger.logOperation(operation, true);
      logger.log();
      logger.logParameters(operation.info.parameters);
      logger.log();
      if (operation.info.response) {
        logger.log('\nRESPONSE')
        logger.logSchema(operation.info.response.schema);
      }
      logger.log();
    }
  });
}


