const fs = require('fs');
const path = require('path');
const http = require('http');
const inquirer = require('inquirer');
const urlParser = require('url');
const querystring = require('querystring');
const request = require('request');
const YAML = require('yamljs');

const DEFAULT_OAUTH_PORT = 3333;
const CALLBACK_HTML_FILE = path.join(__dirname, '..', 'www', 'oauth_callback.html');

const datafire = require('../index');
const logger = require('../util/logger');

module.exports = (args) => {
  let project = datafire.Project.fromDirectory(args.directory);
  let integration = datafire.Integration.fromName(args.integration);
  let security = integration.security;
  if (!security || !Object.keys(security).length) {
    return Promise.reject(new Error("No security needed for " + args.integration));
  }
  security = security[integration.id];

  let aliasQuestion = [{
    type: 'input',
    name: 'alias',
    message: "Choose an alias for this account:",
    validate: alias => /^\w+$/.test(alias) || "Alias can only contain letters, numbers, and _",
    default: integration.id,
  }];
  if (args.alias) {
    aliasQuestion = [];
  }
  console.log(args.port);
  return inquirer.prompt(aliasQuestion)
    .then(answers => {
      let alias = args.alias || answers.alias;
      let accountToEdit = project.accounts[alias] = project.accounts[alias] || {};
      if (accountToEdit.integration && accountToEdit.integration !== args.integration) {
        throw new Error("Account " + alias + " is for integration " + accountToEdit.integration + ", not " + args.integration);
      }
      accountToEdit.integration = args.integration;
      if (security.oauth) {
        return inquirer.prompt([{
          type: 'confirm',
          name: 'generate_token',
          message: "This integration supports OAuth 2.0. Do you want to generate a new token? (press 'n' to enter manually): ",
          default: true,
        }])
        .then(results => {
          if (results.generate_token) {
            return generateToken(project, integration, security.oauth, accountToEdit, accountToEdit, args.port);
          } else {
            return promptAllFields(project, integration, security, accountToEdit);
          }
        })
      } else {
        return promptAllFields(project, integration, security, accountToEdit);
      }
    })
}

let promptAllFields = (project, integration, security, account) => {
  let questions = Object.keys(security.fields).map(field => {
    return {
      type: 'input',
      name: field,
      message: field + ' - ' + security.fields[field] + ':',
    }
  })
  return inquirer.prompt(questions).then(answers => {
    for (let k in answers) {
      if (answers[k]) account[k] = answers[k];
    }
    account.integration = integration.id;
    saveAccounts(project);
  })
}

let generateToken = (project, integration, secOption, accountToEdit, clientAccount, port) => {
  let questions = [];
  if (!clientAccount.client_id || !clientAccount.client_secret) {
    questions.push({
      type: 'input',
      name: 'client_id',
      default: clientAccount.client_id,
      message: "Please enter a client_id to use when generating the token",
    });
    questions.push({
      type: 'input',
      name: 'client_secret',
      default: clientAccount.client_secret,
      message: "Please enter a client_secret to use when generating the token",
    });
  }
  return inquirer.prompt(questions).then(answers => {
    if (answers.client_id) clientAccount.client_id = answers.client_id;
    if (answers.client_secret) clientAccount.client_secret = answers.client_secret;
    return startOAuthServer(project, integration, secOption, accountToEdit, clientAccount, port)
  })
}
let saveAccounts = (project) => {
  let file = path.join(project.directory, 'DataFire-accounts.yml');
  logger.log('Saving credentials to ' + file.replace(process.cwd(), '.'));
  fs.writeFileSync(file, YAML.stringify({accounts: project.accounts}, 10));
}

let getOAuthURL = (integration, secDef, clientAccount, scopes, redirectURI) => {
  var flow = secDef.flow;
  var url = secDef.authorizationUrl;
  var state = Math.random();
  url += url.indexOf('?') === -1 ? '?' : '&';
  url += 'response_type=' + (flow === 'implicit' ? 'token' : 'code');
  url += '&redirect_uri=' + encodeURIComponent(redirectURI);
  url += '&client_id=' + encodeURIComponent(clientAccount.client_id);

  // FIXME: google hack - no refresh token unless these parameters are included
  if (secDef.authorizationUrl.match(/accounts\.google\.com/)) {
    if (flow === 'accessCode') url += '&access_type=offline';
    url += '&approval_prompt=force';
  }

  if (scopes.length > 0) {
    url += '&scope=' + encodeURIComponent(scopes.join(' '));
  }
  url += '&state=' + encodeURIComponent(state);
  return url;
}

let startOAuthServer = (project, integration, secDef, accountToEdit, clientAccount, port) => {
  port = port || DEFAULT_OAUTH_PORT;
  let redirectURI = clientAccount.redirect_uri || 'http://localhost:' + port;
  return new Promise((resolve, reject) => {
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
            redirect_uri: redirectURI,
            grant_type: 'authorization_code',
          },
          json: true,
        }, (err, resp, body) => {
          if (err) return reject(err);
          if (resp.statusCode >= 300) return reject(resp.statusCode);
          let newURL = '/?saved=true#access_token=' + encodeURIComponent(body.access_token);
          newURL += '&refresh_token=' + encodeURIComponent(body.refresh_token);
          newURL += '&saved=true';
          res.writeHead(302, {
            'Location': newURL,
          });
          res.end();
          accountToEdit.access_token = body.access_token;
          accountToEdit.refresh_token = body.refresh_token;
          accountToEdit.client_id = clientAccount.client_id;
          accountToEdit.client_secret = clientAccount.client_secret;
          saveAccounts(project);
        })
      } else {
        fs.readFile(CALLBACK_HTML_FILE, 'utf8', (err, data) => {
          if (err) return reject(err);
          res.end(data);
          if (!search.saved) {
            inquirer.prompt([{
              type: 'input',
              name: 'access_token',
              message: 'access_token:',
            }, {
              type: 'input',
              name: 'refresh_token',
              message: 'refresh_token:',
            }]).then(answers => {
              if (answers.access_token) accountToEdit.access_token = answers.access_token;
              if (answers.refresh_token) accountToEdit.refresh_token = answers.refresh_token;
              saveAccounts(project);
              server.close();
              resolve();
            })
          } else {
            server.close();
            resolve();
          }
        })
      }
    }).listen(port, (err) => {
      if (err) throw err;
      function finish(scopes) {
        let url = getOAuthURL(integration, secDef, clientAccount, scopes, redirectURI);
        logger.log("Visit the URL below to generate access and refresh tokens")
        logger.logInfo("Be sure to set redirect_uri to " + redirectURI + " in your OAuth client's settings page");
        logger.logURL(url);
      }
      let scopes = Object.keys(secDef.scopes || {});
      if (!scopes.length) return finish(scopes);
      let scopeQuestions = [{
        type: 'checkbox',
        name: 'scopes',
        message: "Choose which scopes to enable for this account",
        choices: scopes.map(s => {
          let name = s;
          if (secDef.scopes[s]) name += ' (' + secDef.scopes[s] + ')';
          return {name, value: s};
        }),
      }]
      inquirer.prompt(scopeQuestions).then(answers => finish(answers.scopes));
    });
  });
}
