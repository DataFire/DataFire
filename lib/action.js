"use strict";

const Ajv = require('ajv');
const ajv = new Ajv({
  useDefaults: true,
  unknownFormats: 'ignore',
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

Action.prototype.clone = function(opts) {
  opts = opts || {};
  for (let key in DEFAULTS) {
    opts[key] = opts[key] === undefined ? this[key] : opts[key];
  }
  return new Action(opts);
}

Action.prototype.run = function(input, context) {
  context = context || new Context();
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
    return authorizer.run(input, context)
      .then(acct => {
        if (acct instanceof Response) throw acct;
        if (acct) context.accounts[key] = acct;
      });
  }));

  return promise.then(_ => {
    let ret = this.handler(input, context);
    if (ret === undefined) throw new Error("Handler must return a Promise, Response, or value");
    return ret;
  });
}
