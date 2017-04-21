"use strict";

let Action = require('./action');
let Response = require('./response');
let request = require('request');
let initOpenAPI = require('../util/openapi').initialize;
let path = require('path');
let fs = require('fs');

let Integration = module.exports = function(opts) {
  this.account = opts.account || undefined;
  this.title = opts.title || '';
  this.description = opts.description || '';
  this.securityDefinitions = opts.securityDefinitions || {};

  this.actions = {};
  for (let key in (opts.actions || {})) {
    this.addAction(key, opts.actions[key]);
  }
}

const MODULE_NOT_FOUND = "MODULE_NOT_FOUND";
Integration.fromName = function(name) {
  let integ = null;
  const localLocation = path.join(process.cwd(), 'integrations', name);
  if (fs.existsSync(localLocation)) {
    return require(localLocation);
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

Integration.prototype.as = function(account) {
  let newIntegration = new Integration({
    account: account,
    title: this.title,
    description: this.description,
    securityDefinitions: this.securityDefinitions,
  })
  for (let key in this.actions) {
    newIntegration.addAction(key, this.actions[key].clone());
  }
  return newIntegration;
}

const PARAM_SCHEMA_FIELDS = [
  'format', 'description', 'pattern', 'enum',
  'maximum', 'minimum', 'exclusiveMaximum', 'exclusiveMinimum',
  'maxLength', 'minLength',
  'maxItems', 'minItems', 'uniqueItems',
  'multipleOf',
]
const getSchemaFromParam = function(param) {
  if (param.in === 'body') return param.schema;
  let schema = {type: param.type};
  PARAM_SCHEMA_FIELDS.forEach(f => {
    if (param[f] !== undefined) schema[f] = param[f];
  })
  return schema;
}
const getDefaultResponse = function(op) {
  let keys = Object.keys(op.responses).sort();
  return op.responses[keys[0]];
}

const getActionFromOperation = function(method, path, openapi) {
  let op = openapi.paths[path][method];
  let inputSchema = {type: 'object', properties: {}};
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
    handler: function(input, context) {
      let qs = {};
      let headers = {};
      let form = {};
      let body = null;
      let addParam = (loc, name, val) => {
        if (loc === 'query') qs[name] = val;
        else if (loc === 'header') headers[name] = val;
        else if (loc === 'path') path = path.replace('{' + name + '}', val);
        else if (loc === 'formData') form[name] = val;
        else if (loc === 'body') body = val;
      }
      params.forEach(p => {
        addParam(p.in, p.name, input[p.name]);
      });
      let url = openapi.schemes[0] + '://' + openapi.host;
      if (openapi.basePath && openapi.basePath !== '/') url += openapi.basePath;
      url += path;

      let hasRefreshToken = false;
      if (this.integration && this.integration.account) {
        let account = this.integration.account;
        let authkey = Object.keys(account)[0];
        let def = this.integration.securityDefinitions[authkey];
        if (!def) throw new Error("Security Definition not found for key " + authkey);
        if (def.type === 'apiKey') {
          addParam(def.in, def.name, account[authkey]);
        } else if (def.type === 'basic') {
          let details = account[authkey].username + ':' + account[authkey].password;
          addParam('header', 'Authorization', "Basic " + new Buffer(details, 'utf8').toString('base64'));
        } else if (def.type === 'oauth2') {
          hasRefreshToken = !!account[authkey].refresh_token;
          addParam('header', 'Authorization', "Bearer " + account[authkey].access_token);
        }
      }
      if (Object.keys(form).length === 0) form = undefined;

      let refreshOAuthToken = (callback) => {
        let account = this.integration.account;
        let authkey = Object.keys(account)[0];
        let def = this.integration.securityDefinitions[authkey];
        let form = {
          client_id: account[authkey].client_id,
          client_secret: account[authkey].client_secret,
          refresh_token: account[authkey].refresh_token,
          grant_type: 'refresh_token'
        };
        request.post({
          url: def.tokenUrl,
          json: true,
          form,
        }, (err, resp, body) => {
          if (err) return callback(err);
          if (resp.statusCode >= 300) return callback(new Error(resp.statusCode));
          account[authkey].access_token = body.access_token;
          addParam('header', 'Authorization', "Bearer " + body.access_token);
          callback();
        })
      }

      let sendRequest = (resolve, reject, isRetry) => {
        request[method]({
          url,
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

Integration.fromOpenAPI = function(openapi) {
  openapi = initOpenAPI(openapi);
  let integration = new Integration({
    title: openapi.info.title || openapi.host,
    description: openapi.info.summary || openapi.info.description,
    securityDefinitions: openapi.securityDefinitions,
  });
  for (let path in openapi.paths) {
    for (let method in openapi.paths[path]) {
      let op = openapi.paths[path][method];
      let opID = op.operationId || (method.toUpperCase() + ' ' + path);
      integration.addAction(opID, getActionFromOperation(method, path, openapi));
    }
  }
  return integration;
}
