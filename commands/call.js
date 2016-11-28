const datafire = require('../index');
const logger = require('../lib/logger');

module.exports = (args, callback) => {
  let integration = datafire.Integration.new(args.integration);
  if (args.as) integration.as(args.as);
  args.params = args.params || {};
  integration.initialize(err => {
    if (err) return callback(err);
    let opId = integration.resolveOperationId(args.operation)
    if (!opId) return callback(new Error("Couldn't find operation " + args.operation))
    let op = integration[opId]();
    if (args.params.body) {
      args.params.body = args.params.body.startsWith('@') ?
              JSON.parse(fs.readFileSync(args.params.body, 'utf8'))
            : JSON.parse(args.params.body);
    }
    op.call(args.params, (err, data) => {
      if (err) return callback(err);
      logger.logJSON(data);
      logger.log();
    });
  });
}
