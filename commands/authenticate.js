const fs = require('fs');
const inquirer = require('inquirer');

const datafire = require('../index');
const logger = require('../lib/logger');

const QUESTION_SETS = {
  alias: [
    {name: 'alias', message: "Choose an alias for this account:"}
  ],
  basic: [
    {name: 'username', message: "username:"},
    {name: 'password', message: "password:", type: 'password'},
  ],
  apiKey: [
    {name: 'api_key', message: "api_key:"},
  ],
  oauth2: [
    {name: 'access_token', message: "access_token:"},
    {name: 'refresh_token', message: "refresh_token (optional):"},
    {name: 'client_id', message: "client_id (optional):"},
    {name: 'client_secret', message: "client_secret (optional):"},
  ],
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
    if (secOptions.length === 1) return authenticate(args.integration, secOptions[0].def);
    let question = {name: 'def', message: "This API has multiple authentication flows. Which do you want to use?", type: 'list'};
    question.choices = secOptions.map(o => ({name: o.def.type + ' (' + o.name + ')', value: o.def}))
    inquirer.prompt([question]).then(answer => {
      authenticate(args.integration, answer.def);
    })
  })
}

let authenticate = (integration, secDef) => {
  let questions = QUESTION_SETS[secDef.type];
  inquirer.prompt(questions).then(answers => {
    for (let k in answers) {
      if (!answers[k]) delete answers[k];
    }
    saveCredentials(integration, answers);
  })
}

let saveCredentials = (integration, creds) => {
  let credFile = datafire.credentialsDirectory + '/' + integration + '.json';
  let oldCreds = fs.existsSync(credFile) ? require(credFile) : {};
  inquirer.prompt(QUESTION_SETS.alias).then(answers => {
    let alias = answers.alias;
    oldCreds[alias] = creds;
    console.log('Saving credentials to ' + credFile.replace(process.cwd(), '.'));
    fs.writeFileSync(credFile, JSON.stringify(oldCreds, null, 2));
  });
}
