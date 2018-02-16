"use strict";

const util = require('../util');
var jsf = require('json-schema-faker-bb');
jsf.option({
  failOnInvalidFormat: false,
  failOnInvalidTypes: false,
})

let Action = require('./action');
let Response = require('./response');
let IntegrationInstance = require('./integration-instance');
let openapiUtil = require('../util/openapi');
let path = require('path');
let fs = require('fs');
let request = require('request');

/**
 * Represents a set of related actions
 * @class Integration
 * @param {Object} opts
 * @param {string} [opts.id] - This integration's id
 * @param {string} [opts.description]
 * @param {Object} [opts.security] - security object
 * @param {Object} [opts.security[id].fields] - List of fields that are expected in an account. Values are descriptions.
 * @param {Ajv} [opts.ajv] - An Ajv instance to use for compiling schemas
 */
let Integration = module.exports = function(opts) {
  this.id = opts.id || '';
  this.title = opts.title || '';
  this.description = opts.description || '';
  this.security = opts.security || {};
  this.ajv = opts.ajv;
  this.logo = opts.logo;
  this.definitions = opts.definitions;

  this.actions = {};
  this.allActions = [];
  for (let key in (opts.actions || {})) {
    this.addAction(key, opts.actions[key]);
  }
  this.addOAuthActions();
}

const MODULE_NOT_FOUND = "MODULE_NOT_FOUND";
/**
 * Gets an integration by its common name, e.g. github
 */
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

Integration.prototype.create = function(account) {
  return new IntegrationInstance(this, account);
}

/**
 * Gets JSON-serializable details
 */
Integration.prototype.getDetails = function(withActions=false) {
  let details = {
    id: this.id,
    title: this.title,
    description: this.description,
    security: this.security,
    logo: this.logo,
    actionCount: this.allActions.length,
  };
  if (!withActions) return details;
  if (this.definitions) details.definitions = this.definitions;
  details.actions = this.allActions.map(action => {
    details.definitions = details.definitions || action.inputSchema.definitions || action.outputSchema.definitions;
    let actionDetails = {
      id: action.id.split('/')[1],
      title: action.title,
      description: action.description,
      inputSchema: Object.assign({definitions: null}, action.inputSchema),
      outputSchema: Object.assign({definitions: null}, action.outputSchema),
    }
    if (action.security && action.security[this.id]) {
      actionDetails.security = {};
      actionDetails.security[this.id] = {integration: this.id};
    }
    delete actionDetails.inputSchema.definitions;
    delete actionDetails.outputSchema.definitions;
    return actionDetails;
  });
  return details;
}

/**
 * Replaces all actions with mock output
 */
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

/**
 * Gets action by id, e.g. 'users.get'
 * @param {string} id - Action ID
 */
Integration.prototype.action = function(id) {
  let parts = id.split('.');
  let obj = this.actions;
  parts.forEach(part => obj = obj[part]);
  if (!obj) throw new Error("Action " + this.id + "/" + id + " not found.");
  if (!(obj.action instanceof Action)) throw new Error(this.id + "/" + id + " is not an action");
  return obj.action;
}

/**
 * Adds a new action to the integration
 * @param {string} id - Action ID
 * @param {Action|Object} - The action to add
 */
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
            if (Response.isResponse(e)) {
              message += " with status code " + e.statusCode + ': ' + e.body;
            } else if (e.message) {
              message += ': ' + e.message;
            }
            let error = new Error(message);
            if (Response.isResponse(e)) {
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

/**
 * Auto-generate actions for responding to OAuth callbacks and
 * and getting tokens, if applicable.
 */
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
        if (err) {
          return reject(err);
        } else if (resp.statusCode >= 300) {
          let message = `Token error ${resp.statusCode}`;
          try {
            body = JSON.parse(body);
          } catch (e) {}
          if (body && body.error) {
            message += ' ' + body.error;
            if (body.error_description) {
              message += ': ' + body.error_description;
            }
          }
          return reject(new Error(message));
        } else {
          resolve(JSON.parse(body));
        }
      })
    })
  }
  let security = Object.assign({}, this.security);
  let outputSchema = {
    type: 'object',
    properties: {
      access_token: {type: 'string'},
      refresh_token: {type: 'string'},
      token_type: {type: 'string'},
      scope: {type: 'string'},
      expiration: {type: 'string'},
    }
  };

  this.addAction('oauthCallback', new Action({
    description: "Exchange the code passed to your redirect URI for an access_token",
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
    description: "Exchange a refresh_token for an access_token",
    security,
    outputSchema,
    handler: (input, context) => {
      return getToken('refresh_token', input, context);
    }
  }))
}

/**
 * Builds an integration from an Open API specification.
 */
Integration.fromOpenAPI = function(openapi, id, modifyReq) {
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
    ajv: util.ajv.getInstance(),
  });
  for (let path in openapi.paths) {
    for (let method in openapi.paths[path]) {
      if (util.openapi.METHODS.indexOf(method) === -1) continue;
      let op = openapi.paths[path][method];
      let opID = openapiUtil.getOperationId(method, path, op);
      integration.addAction(opID, Action.fromOpenAPI(method, path, openapi, integration, modifyReq));
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

/**
 * Picks the best Open API security definition to use for this integration
 */
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

