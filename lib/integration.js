"use strict";

let Action = require('./action');
let Response = require('./response');
let request = require('request');
let openapiUtil = require('../util/openapi');
let path = require('path');
let fs = require('fs');

const BODY_METHODS = ['put', 'patch', 'post'];

let Integration = module.exports = function(opts) {
  this.account = opts.account || undefined;
  this.id = opts.id || '';
  this.title = opts.title || '';
  this.description = opts.description || '';

  this.actions = {};
  for (let key in (opts.actions || {})) {
    this.addAction(key, opts.actions[key]);
  }
}

  static new(name) {
    let RESTIntegration = require('./rest-integration');
    let RSSIntegration = require('./rss-integration');
    let tryOpen = (baseDir) => {
      let filename = path.join(baseDir, name);
      if (baseDir !== '@datafire') filename = path.join(filename, 'integration');
      let spec = null;
      try {
        spec = require(filename);
      } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') throw e;
        return
      }
      if (spec.prototype instanceof Integration) {
        return new spec(name, spec.spec);
      } else if (spec.info['x-datafire'].type === 'rss') {
        return new RSSIntegration(name, spec);
      } else {
        return new RESTIntegration(name, spec);
      }
    }
    let integration = null;
    locations.integrations.forEach(loc => {
      integration = integration || tryOpen(loc);
    });
    if (!integration) throw new Error("Integration " + name + " not found. Please run:\ndatafire integrate " + name);
    return integration;
  }
  const datafireLocation = '@datafire/' + name;
  try {
    return require(datafireLocation);
  } catch (e) {
    if (e.code === MODULE_NOT_FOUND) throw new Error("Couldn't find integration " + name);
    throw e;
  }
}

Integration.prototype.action = function(id) {
  let action = this.actions[id];
  if (!action) throw new Error("Action " + this.id + "/" + id + " not found.");
  return action;
}

Integration.prototype.addAction = function(id, action) {
  if (!(action instanceof Action)) action = new Action(action);
  this.actions[id] = action;
  action.integration = this;
}

const getSchemaFromParam = function(param) {
  if (param.in === 'body') return param.schema;
  let schema = {};
  schema.type = param.type === 'file' ? 'string' : param.type; // FIXME: handle file inputs
  openapiUtil.PARAM_SCHEMA_FIELDS.forEach(f => {
    if (param[f] !== undefined) schema[f] = param[f];
  })
  return schema;
}
const getDefaultResponse = function(op) {
  let keys = Object.keys(op.responses).sort();
  return op.responses[keys[0]];
}

const getActionFromOperation = function(method, path, accounts, openapi) {
  let op = openapi.paths[path][method];
  let inputSchema = {
    type: 'object',
    properties: {},
    additionalProperties: false,
    definitions: openapi.definitions,
  };
  let params = op.parameters || [];
  params.forEach(param => {
    let name = param.in === 'body' ? 'body' : param.name;
    inputSchema.properties[name] = getSchemaFromParam(param);
  });
  let response = getDefaultResponse(op);
  return new Action({
    title: op.operationId || (method.toUpperCase() + ' ' + path),
    description: op.description || op.summary,
    inputSchema: params.length ? inputSchema : {},
    outputSchema: response.schema,
    accounts,
    handler: function(input, ctx) {
      let qs = {};
      let headers = {};
      let form = {};
      let body = null;
      let addParam = (loc, name, val) => {
        if (loc === 'query') qs[name] = val;
        else if (loc === 'header') headers[name] = val;
        else if (loc === 'path') path = path.replace('{' + name + '}', val);
        else if (loc === 'formData') form[name] = val;
        else if (loc === 'body') body = JSON.stringify(val);
      }
      params.forEach(p => {
        addParam(p.in, p.name, input[p.name]);
      });
      let url = openapi.schemes[0] + '://' + openapi.host;
      if (openapi.basePath && openapi.basePath !== '/') url += openapi.basePath;
      url += path;

      let security = getBestSecurityDefSecurity(openapi.securityDefinitions);
      let accountName = Object.keys(accounts)[0];
      let account = ctx.accounts[accountName];
      let hasRefreshToken = false;
      if (accountName && account) {
        if (!security) throw new Error("Security not found for " + accountName);
        if (security.api_key) {
          let def = openapi.securityDefinitions[security.security_definition];
          if (!def) throw new Error("Security definition not found for " + security.security_definition);
          addParam(def.in, def.name, account.api_key);
        } else if (security.api_keys) {
          for (let key in security.api_keys) {
            let def = openapi.securityDefinitions[key];
            if (!def) throw new Error("Security definition not found for key " + key);
            addParam(def.in, def.name, account.api_keys[key]);
          }
        } else if (security.username) {
          let details = account.username + ':' + account.password;
          addParam('header', 'Authorization', "Basic " + new Buffer(details, 'utf8').toString('base64'));
        } else if (security.access_token) {
          hasRefreshToken = !!account.refresh_token;
          addParam('header', 'Authorization', "Bearer " + account.access_token);
        }
      }
      if (Object.keys(form).length === 0) form = undefined;

      let refreshOAuthToken = (callback) => {
        let def = openapi.securityDefinitions[security.security_definition];
        let form = {
          client_id: account.client_id,
          client_secret: account.client_secret,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token'
        };
        request.post({
          url: def.tokenUrl,
          json: true,
          form,
        }, (err, resp, body) => {
          if (err) return callback(err);
          if (resp.statusCode >= 300) return callback(new Error(resp.statusCode));
          account.access_token = body.access_token;
          addParam('header', 'Authorization', "Bearer " + body.access_token);
          callback();
        })
      }
      if (BODY_METHODS.indexOf(method) !== -1) {
        let consumes = op.consumes || ['application/json'];
        let cType = consumes.indexOf('application/json') === -1 ? consumes[0] : 'application/json';
        addParam('header', 'Content-Type', cType);
      }

      let sendRequest = (resolve, reject, isRetry) => {
        request[method]({
          url,
          qs,
          headers,
          form,
          body,
        }, (err, resp, body) => {
          if (err) {
            throw err;
          } else if (!isRetry && resp.statusCode === 401 && hasRefreshToken) {
            refreshOAuthToken(err => {
              if (err) reject(new Response({statusCode: 401}));
              else sendRequest(resolve, reject, true);
            })
            return;
          } else if (resp.statusCode >= 300) {
            return reject(new Response({statusCode: resp.statusCode, body}));
          }

          if (resp.headers['content-type'].indexOf('application/json') !== -1) {  // TODO: more permissive check for JSON
            body = JSON.parse(body);
          }
          resolve(body);
        })
      }

      return new Promise(sendRequest);
    }
  });
}

function getBestSecurityDefSecurity(defs) {
  let best = null;
  for (let key in defs) {
    let def = defs[key];
    if (def.type === 'oauth2') {
      best = {
        access_token: 'An OAuth 2.0 access token',
        refresh_token: 'A refresh token (optional)',
        security_definition: key
      };
    } else if (def.type === 'apiKey') {
      if (!best) {
        best = {
          api_key: def.description || "An API key",
          security_definition: key
        };
      } else if (best && best.api_key !== undefined) {
        best = {api_keys: ''};
      }
    } else if (def.type === 'basic') {
      if (!best) best = {
        username: 'Your username',
        password: 'Your password',
        security_definition: key
      };
    }
  }
  return best;
}

Integration.fromOpenAPI = function(openapi, id) {
  openapi = openapiUtil.initialize(openapi, false);
  let accounts = {};
  if (openapi.securityDefinitions) {
    accounts[id || openapi.host] = getBestSecurityDefSecurity(openapi.securityDefinitions);
  }
  let integration = new Integration({
    title: openapi.info.title || openapi.host,
    description: openapi.info.summary || openapi.info.description,
  });
  for (let path in openapi.paths) {
    for (let method in openapi.paths[path]) {
      let op = openapi.paths[path][method];
      let opID = op.operationId || (method.toUpperCase() + ' ' + path);
      integration.addAction(opID, getActionFromOperation(method, path, accounts, openapi));
    }
  }
  return integration;
}
