"use strict";

const Ajv = require('ajv');
var jsf = require('json-schema-faker');
jsf.option({
  failOnInvalidFormat: false,
  failOnInvalidTypes: false,
})

let Action = require('./action');
let Response = require('./response');
let openapiUtil = require('../util/openapi');
let path = require('path');
let fs = require('fs');
let request = require('request');
let openapiAction = require('./openapi-action');

let Integration = module.exports = function(opts) {
  this.account = opts.account || undefined;
  this.id = opts.id || '';
  this.title = opts.title || '';
  this.description = opts.description || '';
  this.security = opts.security || {};
  this.ajv = opts.ajv;
  this.logo = opts.logo;

  this.actions = {};
  this.allActions = [];
  this.addOAuthActions();
  for (let key in (opts.actions || {})) {
    this.addAction(key, opts.actions[key]);
  }
}

const MODULE_NOT_FOUND = "MODULE_NOT_FOUND";
Integration.fromName = function(name) {
  const localLocation = path.join(process.cwd(), 'integrations', name);
  if (fs.existsSync(localLocation)) {
    return require(localLocation);
  }
  let packageName = '@datafire/' + name;
  const datafireLocation = path.join(process.cwd(), 'node_modules', packageName);
  try {
    return require(datafireLocation);
  } catch (e) {
    if (e.code === MODULE_NOT_FOUND && e.message.indexOf(packageName) !== -1) throw new Error("Couldn't find integration " + name);
    throw e;
  }
}

Integration.prototype.mockAll = function() {
  let mockActions = (actions) => {
    for (let id in actions) {
      if (actions[id] instanceof Function) {
        let action = actions[id].action;
        actions[id] = (input, context) => {
          let schema = action.outputSchema;
          // FIXME: see https://github.com/BigstickCarpet/json-schema-ref-parser/issues/40
          if (this.id === 'google_gmail' && id === 'send') {
            schema = JSON.parse(JSON.stringify(schema));
            schema.definitions.MessagePart = {};
          }
          return jsf(schema);
        }
        actions[id].action = action;
      } else {
        mockActions(actions[id]);
      }
    }
  }
  mockActions(this.actions);
}

Integration.prototype.action = function(id) {
  let parts = id.split('.');
  let obj = this.actions;
  parts.forEach(part => obj = obj[part]);
  if (!obj) throw new Error("Action " + this.id + "/" + id + " not found.");
  if (!(obj.action instanceof Action)) throw new Error(this.id + "/" + id + " is not an action");
  return obj.action;
}

Integration.prototype.addAction = function(id, action) {
  if (!(action instanceof Action)) action = new Action(action);
  this.allActions.push(action);
  action.id = this.id + '/' + id;
  action.security = Object.assign({}, this.security, action.security);
  let parts = id.split('.');
  let obj = this.actions;
  parts.forEach((part, idx) => {
    if (idx === parts.length - 1) {
      obj[part] = (input, ctx) => {
        return action.run(input, ctx)
          .catch(e => {
            let message = "Action " + action.id + " failed";
            if (e instanceof Response) {
              message += " with status code " + e.statusCode + ': ' + e.body;
            } else if (e.message) {
              message += ': ' + e.message;
            }
            let error = new Error(message);
            if (e instanceof Response) {
              error.statusCode = e.statusCode;
              error.body = e.body;
            } else if (e instanceof Error) {
              error.stack = e.stack;
            }
            throw error;
          })
      }
      obj[part].action = action;
    } else {
      obj = obj[part] = obj[part] || {};
    }
  })
}

Integration.prototype.addOAuthActions = function() {
  let sec = this.security[this.id] || {};
  if (!sec || !sec.oauth || sec.oauth.flow === 'implicit') return;

  let integID = this.id;
  function getToken(grantType, input, context) {
    return new Promise((resolve, reject) => {
      let acct = context.accounts[integID];
      let form = {
        client_id: acct.client_id,
        client_secret: acct.client_secret,
        redirect_uri: acct.redirect_uri,
        grant_type: grantType,
      }
      if (grantType === 'authorization_code') {
        form.code = input.code;
      } else {
        form.refresh_token = acct.refresh_token;
      }
      request.post({
        url: sec.oauth.tokenUrl,
        headers: {'Accept': 'application/json'},
        form,
      }, (err, resp, body) => {
        if (err) return reject(err);
        if (resp.statusCode >= 300) return reject({statusCode: resp.statusCode, body: body});
        resolve(JSON.parse(body));
      })
    })
  }
  let security = Object.assign({}, this.security);
  let outputSchema = {
    properties: {
      access_token: {type: 'string'},
      refresh_token: {type: 'string'},
      token_type: {type: 'string'},
      scope: {type: 'string'},
      expiration: {type: 'string'},
    }
  };

  this.addAction('oauthCallback', new Action({
    security,
    outputSchema,
    inputs: [{
      title: 'code',
      type: 'string',
    }],
    handler: (input, context) => {
      return getToken('authorization_code', input, context);
    }
  }));

  this.addAction('oauthRefresh', new Action({
    security,
    outputSchema,
    handler: (input, context) => {
      return getToken('refresh_token', input, context);
    }
  }))
}

Integration.fromOpenAPI = function(openapi, id) {
  openapiUtil.initialize(openapi);
  id = id || openapi.host;
  let security = {};
  if (openapi.securityDefinitions && Object.keys(openapi.securityDefinitions).length) {
    security[id] = buildSecurityFromSecurityDefs(id, openapi.securityDefinitions);
  }
  let integration = new Integration({
    id,
    security,
    title: openapi.info.title || openapi.host,
    description: openapi.info.summary || openapi.info.description,
    logo: openapi.info['x-logo'],
    ajv: new Ajv({
      useDefaults: true,
      format: false,
      extendRefs: true,
    }),
  });
  for (let path in openapi.paths) {
    for (let method in openapi.paths[path]) {
      let op = openapi.paths[path][method];
      let opID = openapiUtil.getOperationId(method, path, op);
      integration.addAction(opID, openapiAction(method, path, openapi, integration));
    }
  }
  return integration;
}

const FLOW_PREFERENCES = [
  'implicit',
  'password',
  'application',
  'accessCode',
]
function isBetterFlow(toCheck, base) {
  if (!base) return true;
  return FLOW_PREFERENCES.indexOf(toCheck) > FLOW_PREFERENCES.indexOf(base);
}

function buildSecurityFromSecurityDefs(id, defs) {
  let security = {integration: id, fields: {}};
  for (let key in defs) {
    let def = defs[key];
    if (def.type === 'oauth2') {
      if (!security.oauth || isBetterFlow(def.flow, security.oauth.flow)) {
        security.oauth = def;
        if (security.oauth['x-location']) {
          security.oauth.name = security.oauth['x-location'].name;
          security.oauth.in = security.oauth['x-location'].in;
          delete security.oauth['x-location'];
        }
      }
      security.fields = Object.assign(security.fields, {
        access_token: 'An OAuth access token',
        refresh_token: 'An OAuth refresh token (optional)',
        client_id: 'An OAuth client ID (optional)',
        client_secret: 'An OAuth client secret (optional)',
        redirect_uri: 'The callback URL for your application',
      });
    } else if (def.type === 'basic') {
      security.fields.username = "Your username";
      security.fields.password = "Your password";
    } else if (def.type === 'apiKey') {
      security.fields[key] = def.description || "API key";
    }
  }
  return security;
}

