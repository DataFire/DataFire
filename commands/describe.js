const path = require('path');
const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../util/logger');

module.exports = (args, callback) => {
  let integrationName = args.integration;
  if (!integrationName) {
    let slash = args.action.indexOf('/');
    integrationName = args.action.substring(0, slash);
    args.action = args.action.substring(slash+1, args.action.length);
  }
  let integration = datafire.Integration.fromName(integrationName);
  logger.log();
  if (!args.action) {
    logger.log(chalk.blue(integration.title));
    logger.logDescription(integration.description);
    logger.log();
    for (let actionName in integration.actions) {
      let action = integration.actions[actionName];
      if (args.query && !actionMatchesQuery(actionName, action, args.query)) continue;
      logger.logAction(actionName, action);
      logger.log();
    }
  } else {
    let action = integration.action(args.action);
    logger.logAction(args.action, action);
    logger.logHeading('\nInput');
    logger.logSchema(action.inputSchema);
    logger.logHeading('\nOutput');
    logger.logSchema(action.outputSchema);
    logger.log();
  }
  callback();
}

let actionMatchesQuery = (name, op, q) => {
  q = q.toLowerCase();
  let searchText = name + '\n';
  if (op.title) searchText += op.title + '\n';
  if (op.description) searchText += op.description + '\n';
  searchText = searchText.toLowerCase();
  return searchText.indexOf(q) !== -1;
}
