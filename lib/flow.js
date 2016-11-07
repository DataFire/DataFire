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
  }

  asyncStep() {throw new Error("not implemented")}
  repeatStep() {throw new Error("not implemented")}
  catch() {throw new Error("not implemented")}
  fail() {throw new Error("not implemented")}
  succeed() {throw new Error("not implemented")}
}

module.exports = Flow;
