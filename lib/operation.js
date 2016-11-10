class Operation {
  constructor(name, integration) {
    this.name = name;
    this.integration = integration;
    this.info = this.integration.getOperationDetails(name);
  }

  validateArgs(args) {
    for (let argName in args) {
      let param = (this.info.parameters || []).filter(p => p.name === argName)[0];
      if (!param) throw new Error("Unrecognized argument " + argName + " for operation " + this.name + " in " + this.integration.name);
    }
  }

  call(args, cb) {
    throw new Error("Call not implemented");
  }
}
module.exports = Operation;
