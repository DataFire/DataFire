"use strict";

const nodepath = require('path');
const Ajv = require('ajv');
const Response = require('./response');
const Context = require('./context');
const util = require('../util');

/**
 * Creates a new Action
 * @class Action
 * @param {Object} options
 * @param {Function} options.handler
 * @param {string} options.title
 * @param {string} options.description
 * @param {Object} options.inputSchema - JSON Schema
 * @param {Array} options.inputs
 * @param {Object} options.inputs[] - JSON Schema
 * @param {Object} outputSchema - JSON Schema
 */
const Action = module.exports = function(opts) {
  opts = opts || {};
  this.handler = opts.handler || (_ => Promise.resolve(null));
  this.id = opts.id || 'anonymous';
  this.title = opts.title || '';
  this.description = opts.description || '';
  this.outputSchema = opts.outputSchema || {};
  this.inputSchema = opts.inputSchema || {};
  this.inputs = opts.inputs || null;
  this.security = opts.security || {};

  if (opts.inputs) {
    this.inputSchema = util.schemas.getSchemaFromArray(opts.inputs);
  }
  this.ajv = opts.ajv || new Ajv({
    useDefaults: true,
    format: false,
    extendRefs: true,
  })
  this.validateInput = this.ajv.compile(this.inputSchema);
}

Action.fromName = function(name, directory, integrations={}) {
  let isFile = /^\.?\//.test(name);
  if (isFile) {
    let action = require(nodepath.join(directory, name));
    if (!(action instanceof Action)) action = new Action(action);
    return action;
  }
  let slash = name.indexOf('/');
  if (slash === -1) throw new Error("Could not find action " + name);
  let integrationName = name.substring(0, slash);
  const Integration = require('./integration');
  let integration = integrations[integrationName] || Integration.fromName(name.substring(0, slash));
  let action = integration.action(name.substring(slash + 1, name.length));
  return action;
}

Action.prototype.run = function(input, ctx) {
  ctx = ctx || new Context();
  if (input === undefined) input = null;
  if (this.inputs && input === null) input = {};
  let valid = this.validateInput(input);
  if (!valid) {
    let error = new Error(this.ajv.errorsText(this.validateInput.errors));
    error.statusCode = 400;
    return Promise.reject(error);
  }

  for (let key in this.security) {
    let sec = this.security[key];
    if (sec && !sec.optional && !ctx.accounts[key]) {
      return Promise.reject(new Error("Account " + key + " not specified for action " + this.id + ". Did you remember to pass in the 'context' object?"));
    }
  }

  return Promise.resolve().then(_ => {
    let ret = this.handler(input, ctx);
    if (ret === undefined) throw new Error("Handler must return a Promise, Response, or value");
    return ret;
  });
}
