const async = require('async');
const logger = require('./logger');

class Step {
  constructor(name, operation, request) {
    this.name = name;
    this.operation = operation;
    this.request = request instanceof Function ? request : () => request;
  }

  execute(data, callback) {
    let log = logger.padString(this.name + ': ', 12)
    if (this.operation instanceof Function) {
      logger.log(log + '(custom)');
      this.operation(data);
      callback();
    } else {
      logger.log(log + logger.chalkOperation(this.operation.method, this.operation.path));
      let answers = this.request(data);
      // TODO: if answers is array, execute in series
      this.operation.request(answers, (err, response) => {
        if (err) {
          logger.logError("Request failed: " + err.statusCode);
          logger.logJSON(err.response);
          return callback(err);
        }
        data[this.name] = response;
        callback();
      })
    }
  }
}

class Flow {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.steps = [];
    this.integrations = [];
    this.options = {};
  }

  setDefaults(obj) {
    for (let key in obj) {
      this.options[key] = this.options[key] || obj[key];
    }
  }

  step(name, operation, request) {
    this.steps.push(new Step(name, operation, request));
    if (!(operation instanceof Function) && this.integrations.indexOf(operation.integration) === -1) {
      this.integrations.push(operation.integration);
    }
    return this;
  }

  asyncStep() {throw new Error("not implemented")}
  repeatStep() {throw new Error("not implemented")}
  catch() {throw new Error("not implemented")}

  execute(callback) {
    this.executing = true;
    this.initializeIntegrations((err) => {
      if (err) return callback(err);
      this.data = {};
      async.series(this.steps.map(step => {
        return (asyncCallback) => {
          if (!this.executing) return asyncCallback();
          step.execute(this.data, (err) => {
            asyncCallback(err);
          });
        }
      }), (err) => {
        if (err) return callback(err);
        if (this.executing) this.succeed("Success");
        callback();
      })
    });
  }

  stopExecution() {
    if (!this.executing) throw new Error("stopExecution() called before execute()");
    this.executing = false;
  }

  initializeIntegrations(cb) {
    async.parallel(this.integrations.map((integration) => {
      return (asyncCallback) => {
        integration.initialize(asyncCallback);
      }
    }), cb)
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
