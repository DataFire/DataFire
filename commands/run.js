const path = require('path');
const logger = require('../util/logger');
const datafire = require('../');

module.exports = function(args, callback) {
  let action = datafire.Action.fromName(args.action, process.cwd());
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
