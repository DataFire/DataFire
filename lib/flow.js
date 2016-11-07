const async = require('async');

class Step {
  constructor(name, operation, request) {
    this.name = name;
    this.operation = operation;
    this.request = request instanceof Function ? request : () => request;
  }

  execute(data, callback) {
    if (this.operation instanceof Function) {
      this.operation(data);
      callback();
    } else {
      let answers = this.request(data);
      this.operation.integration.client.request(this.operation.method, this.operation.path, answers, (err, response) => {
        if (err) return callback(err);
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
  fail() {throw new Error("not implemented")}
  succeed() {throw new Error("not implemented")}

  execute(callback) {
    this.initializeIntegrations((err) => {
      if (err) return callback(err);
      this.data = {};
      async.series(this.steps.map(step => {
        return (asyncCallback) => {
          step.execute(this.data, (err) => {
            asyncCallback(err);
          });
        }
      }), callback)
    });
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
}

module.exports = Flow;
