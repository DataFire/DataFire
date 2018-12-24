const path = require('path');
const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../util/logger');
const openapiUtil = require('../util/openapi');

module.exports = (args) => {
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
    function logAction(name, action) {
      if (typeof action === 'object') {
        for (let a in action) {
          let newName = name ? name + '.' + a : a;
          logAction(newName, action[a]);
        }
      } else {
        if (args.query && !actionMatchesQuery(name, action.action, args.query)) return;
        logger.logAction(name, action.action);
        logger.log();
      }
    }
    logAction('', integration.actions);
  } else {
    let action = integration.action(args.action);
    let input = openapiUtil.dereferenceSchema(JSON.parse(JSON.stringify(action.inputSchema)));
    let output = openapiUtil.dereferenceSchema(JSON.parse(JSON.stringify(action.outputSchema)));
    logger.logAction(args.action, action);
    if (input) {
      logger.logHeading('\nInput');
      logger.logSchema(input);
    }
    if (output) {
      logger.logHeading('\nOutput');
      logger.logSchema(output);
    }
    logger.log();
  }
  return Promise.resolve();
}

let actionMatchesQuery = (name, op, q) => {
  q = q.toLowerCase();
  let searchText = name + '\n';
  if (op.title) searchText += op.title + '\n';
  if (op.description) searchText += op.description + '\n';
  searchText = searchText.toLowerCase();
  return searchText.indexOf(q) !== -1;
}
