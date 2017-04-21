const path = require('path');
const logger = require('../util/logger');
const datafire = require('../');

module.exports = function(args, callback) {
  let action = null;
  if (args.integration) {
    let integration = datafire.Integration.fromName(args.integration);
    action = integration.actions[args.action];
    if (!action) throw new Error("Action " + args.action + " not found in integration " + args.integration);
  } else {
    action = require(path.join(process.cwd(), args.action));
  }
  if (!(action instanceof datafire.Action)) throw new Error(args.action + " is not an Action");
  if (typeof args.input === 'string' && action.inputSchema.type !== 'string') {
    args.input = JSON.parse(args.input);
  }
  action.run(args.input)
    .then(result => {
      logger.logJSON(result);
      callback();
    }, e => {
      callback(e);
    })
}
