const fs = require('fs');
const http = require('http');
const inquirer = require('inquirer');

const OAUTH_PORT = 3333;

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

let setDefaults = (questions, defaults) => {
  return questions.map(q => {
    return {
      name: q.name,
      message: q.message,
      type: q.type,
      default: defaults[q.name],
    }
  });
}

let getAccounts = (integration) => {
  let credFile = datafire.credentialsDirectory + '/' + integration + '.json';
  return fs.existsSync(credFile) ? require(credFile) : {};
}

module.exports = (args) => {
  try {
    fs.mkdirSync(datafire.credentialsDirectory);
  } catch (e) {}

  let integration = datafire.Integration.new(args.integration);
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
    let accounts = getAccounts(integration.name);
    let accountToEdit = null;
    let secOption = secOptions[0];
    if (args.as) {
      accountToEdit = accounts[args.as];
      if (!accountToEdit) throw new Error("Account " + args.as + " not found");
      secOption = secOptions.filter(o => o.name === accountToEdit.securityDefinition)[0];
      if (!secOption) throw new Error("Security definition " + accountToEdit.securityDefinition + " not found");
    }
    if (args.generate_token) {
      generateToken(integration, secOption, accounts, accountToEdit)
    } else if (secOptions.length === 1) {
      authenticate(integration, secOption, accounts, accountToEdit);
    } else if (accountToEdit) {
      authenticate(integration, secOption, accounts, accountToEdit);
    } else {
      let question = {name: 'definition', message: "This API has multiple authentication flows. Which do you want to use?", type: 'list'};
      question.choices = secOptions.map(o => ({name: o.def.type + ' (' + o.name + ')', value: o}))
      inquirer.prompt([question]).then(answer => {
        authenticate(integration, answer.definition, accounts, accountToEdit);
      })
    }
  })
}

let authenticate = (integration, secDef, accounts, accountToEdit) => {
  let questions = QUESTION_SETS[secDef.def.type];
  if (accountToEdit && secDef.def.type === 'oauth2') {
    logger.log("You can retrieve an access token here:\n" + getOAuthURL(integration, secDef.def, accountToEdit.client_id));
  }
  if (accountToEdit) questions = setDefaults(questions, accountToEdit);
  inquirer.prompt(questions).then(answers => {
    for (let k in answers) {
      if (!answers[k]) delete answers[k];
    }
    answers.securityDefinition = secDef.name;
    if (accountToEdit) {
      for (let k in answers) accountToEdit[k] = answers[k];
      saveAccounts(integration, accounts);
      return
    } else {
      inquirer.prompt(QUESTION_SETS.alias).then(aliasAnswer => {
        accounts[aliasAnswer.alias] = answers;
        saveAccounts(integration, accounts);
      })
    }
  })
}

let saveAccounts = (integration, accounts) => {
  let oldCreds = getAccounts(integration.name);
  let credFile = datafire.credentialsDirectory + '/' + integration.name + '.json';
  logger.log('Saving credentials to ' + credFile.replace(process.cwd(), '.'));
  fs.writeFileSync(credFile, JSON.stringify(accounts, null, 2));
}

let generateToken = (integration, secDef, accounts, accountToEdit) => {
  startOAuthServer(OAUTH_PORT, (err) => {
    if (err) throw err;
    console.log('startd server');
    let url = getOAuthURL(integration, secDef, accountToEdit.client_id);
    logger.log("Visit this url to retrieve your access and refresh tokens:")
    logger.log(url);
  })
}

let getOAuthURL = (integration, secDef, clientId) => {
  var flow = secDef.flow;
  var url = secDef.authorizationUrl;
  var scopes = [Object.keys(secDef.scopes)[0]];
  var state = Math.random();
  var redirect = 'http://localhost:' + OAUTH_PORT;
  url += '?response_type=' + (flow === 'implicit' ? 'token' : 'code');
  url += '&redirect_uri=' + redirect;
  url += '&client_id=' + encodeURIComponent(clientId);
  if (scopes.length > 0) {
    url += '&scope=' + encodeURIComponent(scopes.join(' '));
  }
  url += '&state=' + encodeURIComponent(state);
  return url;
}

let startOAuthServer = (port, callback) => {
  let server = http.createServer((req, res) => {
    console.log('q', req.query);
    res.send('Your access code is: ' + req.url);
  }).listen(port, callback);
}
