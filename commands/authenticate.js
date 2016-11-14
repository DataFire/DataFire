const fs = require('fs');
const http = require('http');
const inquirer = require('inquirer');
const urlParser = require('url');
const querystring = require('querystring');
const request = require('request');

const OAUTH_PORT = 3333;
const DEFAULT_REDIRECT_URI = 'http://localhost:' + OAUTH_PORT;

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
  oauth_client: [
    {name: 'client_id', message: "client_id:"},
    {name: 'client_secret', message: "client_secret:"},
    {name: 'redirect_uri', message: "redirect_uri:", default: DEFAULT_REDIRECT_URI},
  ],
  oauth_tokens: [
    {name: 'access_token', message: "access_token:"},
    {name: 'refresh_token', message: "refresh_token (optional):"},
  ],
  scopes: [
    {name: 'scopes', type: 'checkbox', message: 'Choose at least one scope to authorize'},
  ]
}

QUESTION_SETS.oauth2 = QUESTION_SETS.oauth_tokens.concat(QUESTION_SETS.oauth_client);

let getQuestions = (secDef) => {
  let qs = JSON.parse(JSON.stringify(QUESTION_SETS[secDef.type]));
  if (secDef.type === 'apiKey') {
    qs[0].name = secDef.name;
    qs[0].message = secDef.name + ':';
  }
  return qs;
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
    if (args.set_default) {
      accounts.default = args.set_default;
      saveAccounts(integration, accounts);
    } else if (args.generate_token) {
      let clientAccount = accountToEdit;
      if (args.client) {
        clientAccount = accounts[args.client];
      }
      generateToken(integration, secOption, accounts, accountToEdit, clientAccount);
    } else if (secOptions.length === 1) {
      authenticate(integration, secOption, accounts, accountToEdit);
    } else if (accountToEdit) {
      authenticate(integration, secOption, accounts, accountToEdit);
    } else {
      let question = {name: 'definition', message: "This API has multiple authentication flows. Which do you want to use?", type: 'list'};
      question.choices = secOptions.map(o => ({name: o.def.type + ' (' + o.name + ')', value: o}))
      inquirer.prompt([question]).then(answers => {
        authenticate(integration, answers.definition, accounts, accountToEdit);
      })
    }
  })
}

let authenticate = (integration, secOption, accounts, accountToEdit) => {
  let questions = getQuestions(secOption.def);
  if (accountToEdit) questions = setDefaults(questions, accountToEdit);
  inquirer.prompt(questions).then(answers => {
    for (let k in answers) {
      if (!answers[k]) delete answers[k];
    }
    answers.securityDefinition = secOption.name;
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

let generateToken = (integration, secOption, accounts, accountToEdit, clientAccount) => {
  let questions = [];
  if (!accountToEdit) questions = questions.concat(QUESTION_SETS.alias);
  if (!clientAccount) questions = questions.concat(QUESTION_SETS.oauth_client);
  inquirer.prompt(questions).then(answers => {
    if (answers.alias) accountToEdit = accounts[answers.alias] = {};
    if (answers.client_id) accountToEdit.client_id = answers.client_id;
    if (answers.client_secret) accountToEdit.client_secret = answers.client_secret;
    if (answers.redirect_uri) accountToEdit.redirect_uri = answers.redirect_uri;
    if (!clientAccount) clientAccount = accountToEdit;
    accountToEdit.securityDefinition = secOption.name;
    startOAuthServer(integration, secOption.def, accounts, accountToEdit, clientAccount)
  })
}
let saveAccounts = (integration, accounts) => {
  let oldCreds = getAccounts(integration.name);
  let credFile = datafire.credentialsDirectory + '/' + integration.name + '.json';
  logger.log('Saving credentials to ' + credFile.replace(process.cwd(), '.'));
  fs.writeFileSync(credFile, JSON.stringify(accounts, null, 2));
}

let getOAuthURL = (integration, secDef, clientAccount, scopes) => {
  var flow = secDef.flow;
  var url = secDef.authorizationUrl;
  var state = Math.random();
  url += '?response_type=' + (flow === 'implicit' ? 'token' : 'code');
  url += '&redirect_uri=' + clientAccount.redirect_uri || DEFAULT_REDIRECT_URI;
  url += '&client_id=' + encodeURIComponent(clientAccount.client_id);
  if (flow === 'accessCode') url += '&access_type=offline';
  if (scopes.length > 0) {
    url += '&scope=' + encodeURIComponent(scopes.join(' '));
  }
  url += '&state=' + encodeURIComponent(state);
  return url;
}

let startOAuthServer = (integration, secDef, accounts, accountToEdit, clientAccount) => {
  let server = http.createServer((req, res) => {
    let urlObj = urlParser.parse(req.url);
    if (urlObj.pathname !== '/') {
      res.writeHead(404);
      res.end();
      return;
    }
    let search = urlParser.parse(req.url).search || '?';
    search = search.substring(1);
    search = querystring.parse(search);
    if (search.code) {
      request.post({
        url: secDef.tokenUrl,
        form: {
          code: search.code,
          client_id: clientAccount.client_id,
          client_secret: clientAccount.client_secret,
          redirect_uri: clientAccount.redirect_uri || DEFAULT_REDIRECT_URI,
          grant_type: 'authorization_code',
        },
        json: true,
      }, (err, resp, body) => {
        let newURL = '/?saved=true#access_token=' + encodeURIComponent(body.access_token);
        newURL += '&refresh_token=' + encodeURIComponent(body.refresh_token);
        newURL += '&saved=true';
        res.writeHead(302, {
          'Location': newURL,
        });
        res.end();
        accountToEdit.access_token = body.access_token;
        accountToEdit.refresh_token = body.refresh_token;
        saveAccounts(integration, accounts);
      })
    } else {
      fs.readFile(__dirname + '/../www/oauth_callback.html', 'utf8', (err, data) => {
        if (err) throw err;
        res.end(data);
        if (!search.saved) {
          inquirer.prompt(QUESTION_SETS.oauth_tokens).then(answers => {
            if (answers.access_token) accountToEdit.access_token = answers.access_token;
            if (answers.refresh_token) accountToEdit.refresh_token = answers.refresh_token;
            saveAccounts(integration, accounts);
            server.close();
            process.exit(0);
          })
        } else {
          server.close();
          process.exit(0);
        }
      })
    }
  }).listen(OAUTH_PORT, (err) => {
    if (err) throw err;
    QUESTION_SETS.scopes[0].choices = Object.keys(secDef.scopes).map(s => {
      return {value: s, name: s + ' (' + secDef.scopes[s] + ')'}
    })
    inquirer.prompt(QUESTION_SETS.scopes).then(answers => {
      let url = getOAuthURL(integration, secDef, clientAccount, answers.scopes);
      logger.log("Visit this url to retrieve your access and refresh tokens:")
      logger.logURL(url);
    })
  });
}
