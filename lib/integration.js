let datafire = require('../index');
let fs = require('fs');

class Integration {
  constructor(name, spec) {
    this.name = name;
    this.spec = spec;
    this.operations = {};
  }

  static new(name) {
    let RESTIntegration = require('./rest-integration');
    let MongoDBIntegration = require('../native_integrations/mongodb');
    if (name === 'mongodb') {
      return new MongoDBIntegration();
    }
    let integration = null;
    fs.readdirSync(datafire.integrationsDirectory).forEach(f => {
      if (f === name + '.openapi.json') {
        integration = new RESTIntegration(name, require(datafire.integrationsDirectory+ '/' + f));
      }
    });
    if (!integration) throw new Error("Integration " + name + " not found");
    return integration;
  }

  initialize(cb) {cb()}
  destroy(cb) {cb()}

  addOperation(op) {
    this.operations[op.name] = op;
    if (this[op.name] === undefined) this[op.name] = () => op;
  }

  as(account) {
    let accounts = {};
    try {
      accounts = require(datafire.credentialsDirectory + '/' + this.name + '.json');
      if (!Object.keys(accounts).length) throw new Error();
    } catch (e) {
      throw new Error("Credentials not found for " + this.name + ". Please run:\ndatafire authenticate " + this.name)
    }
    if (account === 'default') {
      account = accounts[account] || Object.keys(accounts)[0];
    }
    if (!accounts[account]) throw new Error("Account " + account + " not found for " + this.name);
    this.accountName = account;
    this.account = accounts[account];
    return this;
  }

  resolveOperation(str) {
    if (!this.operations[str]) throw new Error("Operation " + str + " not found in " + this.name);
    return this.operations[str];
  }
}

module.exports = Integration;
