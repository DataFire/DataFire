"use strict";

const nodepath = require('path');
const Ajv = require('ajv');
const ajv = new Ajv({
  useDefaults: true,
  format: false,
  extendRefs: true,
});
const Response = require('./response');
const Context = require('./context');

const DEFAULTS = {
  handler: _ => Promise.resolve(null),
  title: '',
  description: '',
  inputs: null,
  inputSchema: null,
  outputSchema: {},
  integration: null,
  authorizers: {},
}

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
 * @param {Object} authorizers
 */

const Action = module.exports = function(opts) {
  opts = opts || {};
  for (let key in DEFAULTS) {
    this[key] = opts[key] || DEFAULTS[key];
  }

  if (opts.inputs) {
    this.inputSchema = {type: 'object', properties: {}};
    this.inputSchema.required = opts.inputs
      .filter(i => i.default === undefined)
      .map(i => i.title);
    opts.inputs.forEach(input => {
      this.inputSchema.properties[input.title] = input;
    });
  }
  this.inputSchema = this.inputSchema || {};
  this.validateInput = ajv.compile(this.inputSchema);
}

Action.fromName = function(name, directory) {
  let parts = name.split('/');
  let isFile = /^\.?\//.test(name);
  if (isFile) return require(nodepath.join(directory, name));
  if (parts.length !== 2) throw new Error("Could not resolve action " + name);
  const Integration = require('./integration');
  let integration = Integration.fromName(parts[0]);
  let action = integration.actions[parts[1]];
  if (!action) throw new Error("Could not find action " + parts[1] + " in integration " + parts[0]);
  return action;
}

Action.prototype.clone = function(opts) {
  opts = opts || {};
  for (let key in DEFAULTS) {
    opts[key] = opts[key] === undefined ? this[key] : opts[key];
  }
  return new Action(opts);
}

Action.prototype.run = function(input, ctx) {
  ctx = ctx || new Context();
  let valid = this.validateInput(input);
  if (!valid) {
    let error = new Error(ajv.errorsText(this.validateInput.errors));
    error.statusCode = 400;
    return Promise.reject(error);
  }
  let allAuthorizers = {};
  if (this.project) {
    for (let key in this.project.authorizers) {
      allAuthorizers[key] = this.project.authorizers[key];
    }
  }
  for (let key in this.authorizers) allAuthorizers[key] = this.authorizers[key];
  let promise = Promise.all(Object.keys(allAuthorizers).map(key => {
    let authorizer = allAuthorizers[key];
    if (authorizer === this) throw new Error("Action has itself as an authorizer");
    return authorizer.run(input, ctx)
      .then(acct => {
        if (acct instanceof Response) throw acct;
        if (acct) ctx.accounts[key] = acct;
      });
  }));

  return promise.then(_ => {
    let ret = this.handler(input, ctx);
    if (ret === undefined) throw new Error("Handler must return a Promise, Response, or value");
    return ret;
  });
}
