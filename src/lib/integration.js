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
  this.security = opts.security || {};

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
  const datafireLocation = path.join(process.cwd(), 'node_modules', '@datafire', name);
  try {
    return require(datafireLocation);
  } catch (e) {
    if (e.code === MODULE_NOT_FOUND) throw new Error("Couldn't find integration " + name);
    throw e;
  }
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
  let parts = id.split('.');
  let obj = this.actions;
  parts.forEach((part, idx) => {
    if (idx === parts.length - 1) {
      obj[part] = (input, ctx) => {
        return action.run(input, ctx)
          .catch(e => {
            let message = "Action " + this.id + "/" + id + " failed";
            if (e instanceof Response) {
              message += " with status code " + e.statusCode + ': ' + e.body;
            } else {
              message += ': ' + e.message;
            }
            let error = new Error(message);
            if (e instanceof Response) {
              error.statusCode = e.statusCode;
              error.body = e.body;
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

const getActionFromOperation = function(method, path, security, openapi) {
  let op = openapi.paths[path][method];
  let params = op.parameters || [];
  let hasRequiredParam = !!params.filter(p => p.required).length;
  let inputSchema = {
    type: hasRequiredParam ? 'object' : ['object', 'null'],
    properties: {},
    additionalProperties: false,
    definitions: openapi.definitions,
  };
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
    security,
    handler: function(input, ctx) {
      input = input || {};
      let reqOpts = {
        method,
        url: openapi.schemes[0] + '://' + openapi.host,
        qs: {},
        qsStringifyOptions: {},
        headers: {},
        form: {},
        body: null,
      }
      if (openapi.basePath && openapi.basePath !== '/') reqOpts.url += openapi.basePath;
      reqOpts.url += path;

      let addParam = (loc, name, val) => {
        if (loc === 'query') reqOpts.qs[name] = val;
        else if (loc === 'header') reqOpts.headers[name] = val;
        else if (loc === 'path') reqOpts.url = reqOpts.url.replace('{' + name + '}', val);
        else if (loc === 'formData') reqOpts.form[name] = val;
        else if (loc === 'body') reqOpts.body = JSON.stringify(val);
      }
      params.forEach(param => {
        let val = input[param.name];
        if (param.collectionFormat && Array.isArray(val)) {
          if (param.collectionFormat === 'multi') {
            reqOpts.qsStringifyOptions.arrayFormat = 'repeat';
          } else {
            reqOpts.qsStringifyOptions.sep = getCollectionFormatSeparator(param.collectionFormat);
          }
        }
        addParam(param.in, param.name, val);
      });

      let accountName = Object.keys(security)[0];
      let account = ctx.accounts[accountName];
      let hasRefreshToken = false;
      let oauthDef = null;
      if (account) {
        for (let key in openapi.securityDefinitions || {}) {
          let def = openapi.securityDefinitions[key];
          if (def.type === 'basic' && account.username && account.password) {
            let details = account.username + ':' + account.password;
            addParam('header', 'Authorization', "Basic " + new Buffer(details, 'utf8').toString('base64'));
          } else if (def.type === 'apiKey' && account[key]) {
            addParam(def.in, def.name, account[key]);
          } else if (def.type === 'oauth2' && account.access_token) {
            hasRefreshToken = !!account.refresh_token;
            oauthDef = def;
            addParam('header', 'Authorization', "Bearer " + account.access_token);
          }
        }
      }

      if (Object.keys(reqOpts.form).length === 0) delete reqOpts.form;

      let refreshOAuthToken = (callback) => {
        let form = {
          client_id: account.client_id,
          client_secret: account.client_secret,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token'
        };
        request.post({
          url: oauthDef.tokenUrl,
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
      addParam('header', 'User-Agent', 'DataFire');

      let sendRequest = (resolve, reject, isRetry) => {
        request(reqOpts, (err, resp, body) => {
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

function buildSecurityFromSecurityDefs(id, defs) {
  let security = {integration: id, fields: {}};
  for (let key in defs) {
    let def = defs[key];
    if (def.type === 'oauth2') {
      security.oauth = def;
      security.fields = Object.assign(security.fields, {
        access_token: 'An OAuth access token',
        refresh_token: 'An OAuth refresh token (optional)',
        client_id: 'An OAuth client ID (optional)',
        client_secret: 'An OAuth client secret (optional)'
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

Integration.fromOpenAPI = function(openapi, id) {
  openapi = openapiUtil.initialize(openapi, false);
  id = id || openapi.host;
  let security = {};
  if (openapi.securityDefinitions) {
    security[id] = buildSecurityFromSecurityDefs(id, openapi.securityDefinitions);
  }
  let integration = new Integration({
    id,
    security,
    title: openapi.info.title || openapi.host,
    description: openapi.info.summary || openapi.info.description,
  });
  for (let path in openapi.paths) {
    for (let method in openapi.paths[path]) {
      let op = openapi.paths[path][method];
      let opID = openapiUtil.getOperationId(method, path, op);
      integration.addAction(opID, getActionFromOperation(method, path, security, openapi));
    }
  }
  return integration;
}
