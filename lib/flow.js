const async = require('async');
const logger = require('./logger');
let chalk = require('chalk');

let Operation = require('./operation');

class Step {
  constructor(name, operation, params, finish) {
    this.name = name;
    this.operation = operation;
    this.params = params instanceof Function ? params : () => params;
    this.finish = finish || (() => {});
  }

  execute(data, callback) {
    logger.log(this.name);
    if (this.operation instanceof Function) {
      this.executeFunction(data, callback);
    } else {
      this.executeOperation(data, callback);
    }
  }

  executeFunction(data, callback) {
    logger.log('  operation: ' + chalk.magenta('custom'));
    if (this.operation.length <= 1) {
      try {
        this.operation(data);
        this.finish(data);
      } catch (e) {
        logger.logError('  Error: ' + e.message);
        return callback(e);
      }
      logger.logSuccess('  Success');
      callback();
    } else {
      this.operation(data, (err, result) => {
        if (err) {
          logger.logError('  Error: ' + err.message);
          return callback(err);
        }
        logger.logSuccess('  Success');
        data[this.name] = result;
        this.finish(data);
        callback();
      })
    }
  }

  executeOperation(data, callback) {
    logger.log('  operation: ' + chalk.magenta(this.operation.name))
    let args = this.params(data);
    this.operation.validateArgs(args);
    // TODO: if args is array, execute in series
    this.operation.call(args || {}, (err, response) => {
      if (err) {
        logger.logError('  Error: ' + err.message);
        return callback(err);
      }
      let msg = '';
      if (Array.isArray(response)) msg = ': got ' + response.length + ' items';
      logger.logSuccess('  Success' + msg);
      data[this.name] = response;
      this.finish(data);
      callback();
    })
  }
}

class Flow {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.steps = [];
    this.catches = [];
    this.integrations = [];
    this.options = {};
  }

  setDefaults(obj) {
    for (let key in obj) {
      this.options[key] = this.options[key] || obj[key];
    }
  }

  setOptions(obj) {
    for (let key in obj) {
      this.options[key] = obj[key];
    }
  }

  step(name, operation, params, finish) {
    if (typeof operation === 'object' && !(operation instanceof Operation)) {
      params = operation.params;
      finish = operation.finish;
      operation = operation.do;
    }
    this.steps.push(new Step(name, operation, params, finish));
    if (!(operation instanceof Function) && this.integrations.indexOf(operation.integration) === -1) {
      this.integrations.push(operation.integration);
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
    this.callForAllIntegrations('initialize', cb);
  }

  destroyIntegrations(cb) {
    this.callForAllIntegrations('destroy', cb);
  }

  handler(event, context, callback) {
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
