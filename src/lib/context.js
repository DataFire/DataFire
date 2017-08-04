/**
 * Creates a new context
 * @class
 * @param {Object} options
 * @param {Object} options.accounts
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
