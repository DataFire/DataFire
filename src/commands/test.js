const path = require('path');
const fs = require('fs');
const YAML = require('yamljs');
const logger = require('../util/logger');
const datafire = require('../');

const run = require('./run');

const JSON_FILE_REGEX = /\.json$/;

module.exports = function(args) {
  let project = datafire.Project.main();
  let test = project.tests[args.test];
  if (!test) throw new Error("Test " + args.test + " not found")
  let action = datafire.Action.fromName(test.action, process.cwd());
  return run(Object.assign({}, args, {
    action: test.action,
    input: test.input,
    accounts: test.accounts,
  }));
}
