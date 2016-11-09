class Operation {
  constructor(name, integration) {
    this.name = name;
    this.integration = integration;
  }

  call(args, cb) {
    throw new Error("Call not implemented");
  }
}
module.exports = Operation;
