const fs = require('fs');
const inquirer = require('inquirer');

const datafire = require('../index');
const logger = require('../lib/logger');

const QUESTIONS = {
  alias: {name: 'alias', message: "Choose an alias for this account: "},
  username: {name: 'username', message: "username: "},
  password: {name: 'password', message: "password: ", type: 'password'},
  api_key: {name: 'api_key', message: "api_key: "},
}

module.exports = (args) => {
  try {
    fs.mkdirSync(datafire.credentialsDirectory);
  } catch (e) {}

  let integration = new datafire.Integration(args.integration);
  integration.initialize(err => {
    if (err) throw err;
    let secDefs = integration.spec.securityDefinitions;
    if (!secDefs || !Object.keys(secDefs).length) {
      logger.logError("No security definitions found for " + args.integration);
      return;
    }
    let secOptions = Object.keys(secDefs).map(name => {
      return {
        name: name,
        def: secDefs[name],
      }
    });
    if (secOptions.length === 1) return authorize(args.integration, secOptions[0].def);
  })
}

let authorize = (integration, secDef) => {
  let credFile = datafire.credentialsDirectory + '/' + integration + '.json';
  let creds = fs.existsSync(credFile) ? require(credFile) : {};
  inquirer.prompt([QUESTIONS.alias]).then(answers => {
    let alias = answers.alias;
    if (secDef.type === 'basic') {
      inquirer.prompt([QUESTIONS.username, QUESTIONS.password]).then(answers => {
        creds[alias] = answers;
        fs.writeFileSync(datafire.credentialsDirectory + '/' + integration + '.json', JSON.stringify(creds, null, 2));
      })
    }
  })
}
