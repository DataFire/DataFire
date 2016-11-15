const datafire = require('../index');
const logger = require('../lib/logger');

module.exports = (args, callback) => {
  let integration = datafire.Integration.new(args.integration);
  if (args.as) integration.as(args.as);
  integration.initialize(err => {
    if (err) return callback(err);
    let opId = integration.resolveOperationId(args.operation)
    if (!opId) return callback(new Error("Couldn't find operation " + args.operation))
    let op = integration[opId]();
    op.call(args.params || {}, (err, data) => {
      if (err) return callback(err);
      logger.logJSON(data);
      logger.log();
    });
  });
}
