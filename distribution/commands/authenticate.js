'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var inquirer = require('inquirer');
var urlParser = require('url');
var querystring = require('querystring');
var request = require('request');

var OAUTH_PORT = 3333;
var DEFAULT_REDIRECT_URI = 'http://localhost:' + OAUTH_PORT;
var CALLBACK_HTML_FILE = path.join(__dirname, '..', 'www', 'oauth_callback.html');

var datafire = require('../index');
var logger = require('../lib/logger');

var QUESTION_SETS = {
  alias: [{ name: 'alias', message: "Choose an alias for this account:" }],
  basic: [{ name: 'username', message: "username:" }, { name: 'password', message: "password:", type: 'password' }],
  apiKey: [{ name: 'api_key', message: "api_key:" }],
  oauth_client: [{ name: 'client_id', message: "client_id:" }, { name: 'client_secret', message: "client_secret:" }, { name: 'redirect_uri', message: "redirect_uri:", default: DEFAULT_REDIRECT_URI }],
  oauth_tokens: [{ name: 'access_token', message: "access_token:" }, { name: 'refresh_token', message: "refresh_token (optional):" }],
  scopes: [{ name: 'scopes', type: 'checkbox', message: 'Choose at least one scope to authorize' }],
  choose_definition: [{ name: 'definition', message: "This API has multiple authentication flows. Which do you want to use?", type: 'list' }]
};

QUESTION_SETS.oauth2 = QUESTION_SETS.oauth_tokens.concat(QUESTION_SETS.oauth_client);

var getQuestions = function getQuestions(secDef, allDefs) {
  var qs = JSON.parse(JSON.stringify(QUESTION_SETS[secDef.type]));
  if (secDef.type === 'apiKey') {
    var allApiKeys = Object.keys(allDefs).map(function (k) {
      return allDefs[k];
    }).filter(function (d) {
      return d.type === 'apiKey';
    });
    qs = allApiKeys.map(function (def) {
      return {
        name: def.name,
        message: def.name + ':'
      };
    });
  }
  return qs;
};

var getChooseDefQuestion = function getChooseDefQuestion(secOptions) {
  var qs = JSON.parse(JSON.stringify(QUESTION_SETS.choose_definition));
  qs[0].choices = secOptions.map(function (o) {
    var description = '(' + o.name;
    if (o.def.description) description += ' - ' + o.def.description;
    description += ')';
    return {
      name: o.def.type + ' ' + description,
      value: o
    };
  });
  return qs;
};

var setDefaults = function setDefaults(questions, defaults) {
  return questions.map(function (q) {
    return {
      name: q.name,
      message: q.message,
      type: q.type,
      default: defaults[q.name]
    };
  });
};

var getAccounts = function getAccounts(integration) {
  var credFile = path.join(datafire.credentialsDirectory, integration + '.json');
  return fs.existsSync(credFile) ? require(credFile) : {};
};

module.exports = function (args) {
  try {
    fs.mkdirSync(datafire.credentialsDirectory);
  } catch (e) {}

  var integration = datafire.Integration.new(args.integration);
  integration.initialize(function (err) {
    if (err) throw err;
    var secDefs = integration.spec.securityDefinitions;
    if (!secDefs || !Object.keys(secDefs).length) {
      logger.logError("No security definitions found for " + args.integration);
      return;
    }
    var secOptions = Object.keys(secDefs).map(function (name) {
      return {
        name: name,
        def: secDefs[name]
      };
    });
    var accounts = getAccounts(integration.name);
    var accountToEdit = null;
    var secOption = null;
    if (args.as) {
      accountToEdit = accounts[args.as];
      if (!accountToEdit) throw new Error("Account " + args.as + " not found");
      secOption = secOptions.filter(function (o) {
        return o.name === accountToEdit.securityDefinition;
      })[0];
      if (!secOption) throw new Error("Security definition " + accountToEdit.securityDefinition + " not found");
    } else if (secOptions.length === 1) {
      secOption = secOptions[0];
    }
    var questions = secOption ? [] : getChooseDefQuestion(secOptions);
    inquirer.prompt(questions).then(function (answers) {
      if (answers.definition) secOption = answers.definition;
      if (args.set_default) {
        accounts.default = args.set_default;
        saveAccounts(integration, accounts);
      } else if (args.generate_token) {
        var clientAccount = accountToEdit;
        if (args.client) {
          clientAccount = accounts[args.client];
        }
        generateToken(integration, secOption, accounts, accountToEdit, clientAccount);
      } else {
        authenticate(integration, secOption, accounts, accountToEdit);
      }
    });
  });
};

var authenticate = function authenticate(integration, secOption, accounts, accountToEdit) {
  var questions = getQuestions(secOption.def, integration.spec.securityDefinitions);
  if (accountToEdit) questions = setDefaults(questions, accountToEdit);
  inquirer.prompt(questions).then(function (answers) {
    for (var k in answers) {
      if (!answers[k]) delete answers[k];
    }
    answers.securityDefinition = secOption.name;
    if (accountToEdit) {
      for (var _k in answers) {
        accountToEdit[_k] = answers[_k];
      }saveAccounts(integration, accounts);
      return;
    } else {
      inquirer.prompt(QUESTION_SETS.alias).then(function (aliasAnswer) {
        accounts[aliasAnswer.alias] = answers;
        saveAccounts(integration, accounts);
      });
    }
  });
};

var generateToken = function generateToken(integration, secOption, accounts, accountToEdit, clientAccount) {
  var questions = [];
  if (!accountToEdit) questions = questions.concat(QUESTION_SETS.alias);
  if (!clientAccount) questions = questions.concat(QUESTION_SETS.oauth_client);
  inquirer.prompt(questions).then(function (answers) {
    if (answers.alias) accountToEdit = accounts[answers.alias] = {};
    if (answers.client_id) accountToEdit.client_id = answers.client_id;
    if (answers.client_secret) accountToEdit.client_secret = answers.client_secret;
    if (answers.redirect_uri) accountToEdit.redirect_uri = answers.redirect_uri;
    if (!clientAccount) clientAccount = accountToEdit;
    accountToEdit.securityDefinition = secOption.name;
    startOAuthServer(integration, secOption.def, accounts, accountToEdit, clientAccount);
  });
};
var saveAccounts = function saveAccounts(integration, accounts) {
  var oldCreds = getAccounts(integration.name);
  var credFile = path.join(datafire.credentialsDirectory, integration.name + '.json');
  logger.log('Saving credentials to ' + credFile.replace(process.cwd(), '.'));
  fs.writeFileSync(credFile, JSON.stringify(accounts, null, 2));
};

var getOAuthURL = function getOAuthURL(integration, secDef, clientAccount, scopes) {
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
};

var startOAuthServer = function startOAuthServer(integration, secDef, accounts, accountToEdit, clientAccount) {
  var server = http.createServer(function (req, res) {
    var urlObj = urlParser.parse(req.url);
    if (urlObj.pathname !== '/') {
      res.writeHead(404);
      res.end();
      return;
    }
    var search = urlParser.parse(req.url).search || '?';
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
          grant_type: 'authorization_code'
        },
        json: true
      }, function (err, resp, body) {
        var newURL = '/?saved=true#access_token=' + encodeURIComponent(body.access_token);
        newURL += '&refresh_token=' + encodeURIComponent(body.refresh_token);
        newURL += '&saved=true';
        res.writeHead(302, {
          'Location': newURL
        });
        res.end();
        accountToEdit.access_token = body.access_token;
        accountToEdit.refresh_token = body.refresh_token;
        accountToEdit.client_id = clientAccount.client_id;
        accountToEdit.client_secret = clientAccount.client_secret;
        saveAccounts(integration, accounts);
      });
    } else {
      fs.readFile(CALLBACK_HTML_FILE, 'utf8', function (err, data) {
        if (err) throw err;
        res.end(data);
        if (!search.saved) {
          inquirer.prompt(QUESTION_SETS.oauth_tokens).then(function (answers) {
            if (answers.access_token) accountToEdit.access_token = answers.access_token;
            if (answers.refresh_token) accountToEdit.refresh_token = answers.refresh_token;
            accountToEdit.client_id = clientAccount.client_id;
            accountToEdit.client_secret = clientAccount.client_secret;
            saveAccounts(integration, accounts);
            server.close();
            process.exit(0);
          });
        } else {
          server.close();
          process.exit(0);
        }
      });
    }
  }).listen(OAUTH_PORT, function (err) {
    if (err) throw err;
    QUESTION_SETS.scopes[0].choices = Object.keys(secDef.scopes).map(function (s) {
      return { value: s, name: s + ' (' + secDef.scopes[s] + ')' };
    });
    inquirer.prompt(QUESTION_SETS.scopes).then(function (answers) {
      var url = getOAuthURL(integration, secDef, clientAccount, answers.scopes);
      logger.log("Visit this url to retrieve your access and refresh tokens:");
      logger.logURL(url);
    });
  });
};