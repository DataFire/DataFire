const path = require('path');
const logger = require('../util/logger');
const datafire = require('../');

module.exports = function(args, callback) {
  let action = datafire.Action.fromName(args.action, process.cwd());
  if (typeof args.input === 'string' && action.inputSchema.type !== 'string') {
    args.input = JSON.parse(args.input);
  }
  let context = new datafire.Context({accounts: args.accounts, type: 'command'});
  action.run(args.input || null, context)
    .then(result => {
      logger.logJSON(result);
      callback();
    }, e => {
      if (e instanceof datafire.Response) {
        e = new Error(e.statusCode + ": " + e.body);
      }
      callback(e);
    })
}
