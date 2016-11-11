let datafire = require('../index');
let fs = require('fs');

class Integration {
  constructor(name, spec) {
    this.name = name;
    this.spec = spec;
    for (let opId in this.spec.operations) {
      let op = this.spec.operations[opId];
      if (this[opId] === undefined) {
        this[opId] = () => this.makeOperation(opId, op);
      }
    }
  }

  static new(name) {
    let RESTIntegration = require('./rest-integration');
    let RSSIntegration = require('./rss-integration');
    let MongoDBIntegration = require('../native_integrations/mongodb');
    if (name === 'mongodb') {
      return new MongoDBIntegration();
    }
    let tryOpen = (dir) => {
      let filename = dir + '/' + name + '.openapi.json';
      let spec = null;
      try {
        spec = require(filename);
      } catch (e) {
        filename = dir + '/' + name + '.rss.json';
        try {
          spec = require(filename)
        } catch (e) {};
      }
      if (!spec) return;
      if (filename.endsWith('.openapi.json')) {
        return new RESTIntegration(name, spec);
      } else {
        return new RSSIntegration(name, spec);
      }
    }
    let integration = tryOpen(datafire.integrationsDirectory) || tryOpen(__dirname + '/../native_integrations');
    if (!integration) throw new Error("Integration " + name + " not found");
    return integration;
  }

  initialize(cb) {cb()}
  destroy(cb) {cb()}

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

  getOperationDetails(str) {
    let id = this.resolveOperationId(str);
    if (!this.spec.operations[id]) throw new Error("Operation " + str + " not found in " + this.name);
    return this.spec.operations[id];
  }

  resolveOperationId(str) {
    return str;
  }

  makeOperation(name, opSpec) {
    throw new Error("makeOperation not implemented")
  }
}

module.exports = Integration;
