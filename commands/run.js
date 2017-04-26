const path = require('path');
const logger = require('../util/logger');
const datafire = require('../');

module.exports = function(args) {
  let action = datafire.Action.fromName(args.action, process.cwd());
  if (typeof args.input === 'string' && action.inputSchema.type !== 'string') {
    args.input = JSON.parse(args.input);
  }
  let project = datafire.Project.main();
  let context = new datafire.Context({
    accounts: Object.assign({}, project.accounts, args.accounts),
    type: 'command'
  });
  return action.run(args.input, context)
    .then(result => {
      logger.logJSON(result);
    }, e => {
      if (e instanceof datafire.Response) {
        e = new Error(e.statusCode + ": " + e.body);
      }
      return Promise.reject(e);
    })
}
