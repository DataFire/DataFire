const datafire = require('../index');
const logger = require('../lib/logger');

module.exports = (args) => {
  let integration = datafire.Integration.new(args.integration);
  if (args.as) integration.as(args.as);
  integration.initialize(err => {
    if (err) throw err;
    let op = integration.resolveOperation(args.operation);
    op.request(args.params || {}, (err, data) => {
      if (err) {
        logger.logError("Request failed: " + err.statusCode);
      } else {
        logger.logSuccess("Success");
      }
      logger.logJSON(data);
      logger.log();
    });
  });
}
