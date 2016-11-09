const async = require('async');
const logger = require('./logger');

class Step {
  constructor(name, operation, request) {
    this.name = name;
    this.operation = operation;
    this.request = request instanceof Function ? request : () => request;
  }

  execute(data, callback) {
    let logTitle = logger.padString(this.name + ': ', 12)
    if (this.operation instanceof Function) {
      logger.log(logTitle + '(custom)');
      try {
        this.operation(data);
      } catch (e) {
        logger.logError(logTitle + e.message);
        return callback(e);
      }
      logger.logSuccess(logTitle + "Success");
      callback();
    } else {
      logger.log(logTitle + logger.chalkOperation(this.operation.method, this.operation.path));
      let answers = this.request(data);
      // TODO: if answers is array, execute in series
      this.operation.request(answers, (err, response) => {
        if (err) {
          logger.logError(logTitle + "request failed - " + err.statusCode);
          //logger.logJSON(err.response);
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
    this.catches = [];
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

  catch(fn) {
    this.catches.push({index: this.steps.length, callback: fn})
    return this;
  }

  getCatch(index) {
    return this.catches.filter(c => c.index > index)[0];
  }

  execute(callback) {
    callback = callback || ((e) => {if (e) throw e});
    this.executing = true;
    this.initializeIntegrations((err) => {
      if (err) return callback(err);
      this.data = {};
      this.executeFromStep(0, (err) => {
        if (err) return callback(err);
        if (this.executing) this.succeed("Success");
        callback();
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
