class Step {
  constructor(name, operation, request) {
    this.name = name;
    this.operation = operation;
    this.request = request instanceof Function ? request : () => request;
  }
}

class Flow {
  constructor(name) {
    this.name = name;
    this.steps = [];
  }

  step(name, operation, request) {
    this.steps.push(new Step(name, operation, request));
    if (this.integrations.indexOf(operation.integration) === -1) {
      this.integrations.push(operation.integration);
    }
  }

  asyncStep() {throw new Error("not implemented")}
  repeatStep() {throw new Error("not implemented")}
  catch() {throw new Error("not implemented")}
  fail() {throw new Error("not implemented")}
  succeed() {throw new Error("not implemented")}

  execute(callback) {
    this.initializeIntegrations((err) => {
      if (err) return callback(err);
      this.data = [];
      async.series(this.steps.map(step => {
        return (asyncCallback) => {
          let answers = step.request(this.data);
          this.client.request(step.operation.method, step.operation.path, answers, (err, data) => {
            if (err) return asyncCallback(err);
            this.data.push(data);
            this.data[step.name] = data;
            asyncCallback();
          })
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
}

module.exports = Flow;
