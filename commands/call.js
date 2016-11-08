const datafire = require('../index');
const logger = require('../lib/logger');

module.exports = (args) => {
  let integration = new datafire.Integration(args.integration);
  integration.initialize(err => {
    if (err) throw err;
    let op = integration.resolveOperation(args.operation);
    op.request(args.params || {}, (err, data) => {
      if (err) throw err;
      logger.log();
      logger.logJSON(data);
      logger.log();
    });
  });
}
