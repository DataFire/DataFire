"use strict";

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
let rssParser = require('rss-parser');
let openapiAction = require('./openapi-action');

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

Integration.fromOpenAPI = function(openapi, id) {
  openapiUtil.initialize(openapi);
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
      integration.addAction(opID, openapiAction(method, path, security, openapi));
    }
  }
  return integration;
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

