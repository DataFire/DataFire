const fs = require('fs');
const inquirer = require('inquirer');

const datafire = require('../index');
const logger = require('../lib/logger');

const QUESTIONS = {
  alias: {name: 'alias', message: "Choose an alias for this account:"},
  username: {name: 'username', message: "username:"},
  password: {name: 'password', message: "password:", type: 'password'},
  api_key: {name: 'api_key', message: "api_key:"},
  client_id: {name: 'client_id', message: "client_id:"},
  client_secret: {name: 'client_secret', message: "client_secret:"},
  access_token: {name: 'access_token', message: "access_token:"},
  refresh_token: {name: 'refresh_token', message: "refresh_token:"},
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
    let question = {name: 'def', message: "This API has multiple authentication flows. Which do you want to use?", type: 'list'};
    question.choices = secOptions.map(o => ({name: o.def.type + ' (' + o.name + ')', value: o.def}))
    inquirer.prompt([question]).then(answer => {
      authorize(args.integration, answer.def);
    })
  })
}

let authorize = (integration, secDef) => {
  let questions = null;
  if (secDef.type === 'basic') {
    questions = [QUESTIONS.username, QUESTIONS.password];
  } else if (secDef.type === 'apiKey') {
    questions = [QUESTIONS.api_key];
  } else if (secDef.type === 'oauth2') {
    questions = [QUESTIONS.client_id, QUESTIONS.client_secret, QUESTIONS.access_token, QUESTIONS.refresh_token];
  }
  inquirer.prompt(questions).then(answers => {
    saveCredentials(integration, answers);
  })
}

let saveCredentials = (integration, creds) => {
  let credFile = datafire.credentialsDirectory + '/' + integration + '.json';
  let oldCreds = fs.existsSync(credFile) ? require(credFile) : {};
  inquirer.prompt([QUESTIONS.alias]).then(answers => {
    let alias = answers.alias;
    oldCreds[alias] = creds;
    console.log('saving to ' + credFile.replace(process.cwd(), '.'));
    fs.writeFileSync(credFile, JSON.stringify(oldCreds, null, 2));
  });
}
