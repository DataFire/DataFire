
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
    this.startTime = new Date();
    if (opts.request) this.request = opts.request;
  }
}

module.exports = Context;
