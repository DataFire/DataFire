/**
 * Creates a new context, which can be passed to actions.
 * @class
 * @param {Object} options
 * @param {string} options.type - The context type (e.g. task or http)
 * @param {Object} options.accounts - list of accounts, keyed by alias
 * @param {Object} options.variables - list of variables, keyed by name
 * @param {Object} options.request - HTTP request details
 */
class Context {
  constructor(opts={}) {
    this.results = {};
    this.type = opts.type || 'unknown';
    this.variables = opts.variables || {};
    this.accounts = {};
    for (let key in opts.accounts || {}) {
      this.accounts[key] = opts.accounts[key];
    }
    for (let key in this.accounts) {
      if (typeof this.accounts[key] === 'string') {
        this.accounts[key] = this.accounts[this.accounts[key]];
      }
    }
    this.startTime = new Date();
    if (opts.request) this.request = opts.request;
  }
}

module.exports = Context;
