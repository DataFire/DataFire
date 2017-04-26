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
    this.accounts = opts.accounts || {};
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
