const path = require('path');
const fs = require('fs');
const YAML = require('yamljs');
const logger = require('../util/logger');
const datafire = require('../');

const JSON_FILE_REGEX = /\.json$/;

module.exports = function(args) {
  let action = datafire.Action.fromName(args.action, process.cwd());
  if (typeof args.input === 'string' && action.inputSchema.type !== 'string') {
    args.input = JSON.parse(args.input);
  }
  if (args.inputFile) {
    let content = fs.readFileSync(args.inputFile, 'utf8');
    if (args.inputFile.match(JSON_FILE_REGEX)) {
      args.input = JSON.parse(content);
    } else {
      args.input = YAML.parse(content);
    }
  }
  let project = datafire.Project.main();
  let context = project.getContext({
    type: 'command',
    accounts: args.accounts,
  });
  return action.run(args.input, context)
    .then(result => {
      if (args.outputFile) {
        let content = '';
        if (args.outputFile.match(JSON_FILE_REGEX)) {
          content = JSON.stringify(result, null, 2);
        } else {
          content = YAML.stringify(result, 10);
        }
        fs.writeFileSync(args.outputFile, content);
      } else {
        logger.logJSON(result);
      }
    }, e => {
      if (!(e instanceof Error)) {
        if (e.statusCode) {
          e = new Error(e.statusCode + ": " + e.body);
        } else if (e.toString) {
          e = new Error(e.toString())
        } else {
          e = new Error("Unknown error");
        }
      }
      return Promise.reject(e);
    })
}
