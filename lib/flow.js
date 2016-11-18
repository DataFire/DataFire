const async = require('async');
const logger = require('./logger');
const chalk = require('chalk');

let Operation = require('./operation');
let Step = require('./step');

class Flow {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.initialized = false;
    this.steps = [];
    this.catches = [];
    this.integrations = [];
    this.params = {};
    this.handler = this.handler.bind(this); // Workaround for AWS Lamdba.
  }

  setDefaults(obj) {
    for (let key in obj) {
      this.params[key] = this.params[key] || obj[key];
    }
  }

  setOptions(obj) {
    for (let key in obj) {
      this.params[key] = obj[key];
    }
  }

  step(name, operation, params, finish) {
    let opts = {};
    if (typeof operation === 'object' && !(operation instanceof Operation)) {
      opts = operation;
    } else {
      opts.do = operation;
      opts.params = params;
      opts.finish = finish;
    }
    this.steps.push(new Step(name, opts));
    if (!(opts.do instanceof Function) && this.integrations.indexOf(opts.do.integration) === -1) {
      this.integrations.push(opts.do.integration);
    }
    return this;
  }

  asyncStep() {throw new Error("not implemented")}
  repeatStep() {throw new Error("not implemented")}

  catch(fn) {
    this.catches.push({index: this.steps.length, callback: fn})
    return this;
  }

  getCatch(index) {
    return this.catches.filter(c => c.index > index)[0];
  }

  execute(callback) {
    callback = callback || ((e) => {if (e) throw e});

    let finish = (err) => {
      this.destroyIntegrations(destroyErr => {
        return callback(err || destroyErr);
      })
    }

    this.executing = true;
    this.initializeIntegrations((err) => {
      if (err) return finish(err);
      this.initialized = true;
      this.data = {};
      this.executeFromStep(0, (err) => {
        if (err) return finish(err);
        if (this.executing) this.succeed("Success");
        finish();
      })
    });
  }

  executeFromStep(index, callback) {
    if (!this.executing) return callback();
    if (index === this.steps.length) return callback();
    let step = this.steps[index];
    step.execute(this.data, err => {
      if (err) {
        let catchBlock = this.getCatch(index);
        if (!catchBlock || !this.executing) return callback(err);
        catchBlock.callback(err, this.data);
        let newIndex = catchBlock.index;
        this.executeFromStep(catchBlock.index, callback);
      } else {
        this.executeFromStep(++index, callback);
      }
    })
  }

  stopExecution() {
    if (!this.executing) throw new Error("stopExecution() called before execute()");
    this.executing = false;
  }

  callForAllIntegrations(method, cb) {
    async.parallel(this.integrations.map((integration) => {
      return (asyncCallback) => {
        integration[method](asyncCallback);
      }
    }), cb)
  }

  initializeIntegrations(cb) {
    if (this.initialized) return cb();
    this.callForAllIntegrations('initialize', cb);
  }

  destroyIntegrations(cb) {
    this.callForAllIntegrations('destroy', cb);
  }

  handler(event, context, callback) {
    // TODO: bind params from event.query, event.queryStringParameters, etc.
    this.execute(callback);
  }

  fail(message) {
    this.stopExecution();
    throw new Error(message);
  }
  succeed(message) {
    this.stopExecution();
    logger.logSuccess(message);
  }
}

module.exports = Flow;
