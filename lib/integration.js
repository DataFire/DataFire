const datafire = require('../index');
const fs = require('fs');
const path = require('path');
const locations = require('./locations');

let maybeReadJSON = (dir, file) => {
  let filename = path.join(dir, file);
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (e) {}
}

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
    let tryOpen = (baseDir) => {
      let filename = path.join(baseDir, name);
      if (baseDir !== '@datafire') filename = path.join(filename, 'integration');
      let spec = null;
      try {
        spec = require(filename);
      } catch (e) {
        return
      }
      if (spec.prototype instanceof Integration) {
        return spec;
      } else if (spec.info['x-datafire'].type === 'rss') {
        return new RSSIntegration(name, spec);
      } else {
        return new RESTIntegration(name, spec);
      }
    }
    let integration = null;
    locations.integrations.forEach(loc => {
      integration = integration || tryOpen(loc);
    });
    if (!integration) throw new Error("Integration " + name + " not found. Please run:\ndatafire integrate " + name);
    return integration;
  }

  initialize(cb) {cb()}
  destroy(cb) {cb()}

  getAccounts() {
    let accounts = null;
    locations.credentials.forEach(dir => {
      if (accounts) return;
      try {
        accounts = require(path.join(dir, this.name));
      } catch (e) {}
    })
    if (!accounts) {
      throw new Error("Credentials not found for " + this.name + ". Please run:\ndatafire authenticate " + this.name)
    }
    return accounts;
  }

  as(account) {
    let accounts = this.getAccounts();
    if (account === 'default') {
      account = accounts[account] || Object.keys(accounts)[0];
    }
    if (!accounts[account]) throw new Error("Account " + account + " not found for " + this.name);
    this.accountName = account;
    this.account = accounts[account];
    return this;
  }

  saveCredentials(newCreds, cb) {
    this.account = newCreds;
    let accounts = this.getAccounts();
    accounts[this.accountName] = newCreds;
    fs.writeFile(path.join(locations.credentials[0], this.name + '.json'), JSON.stringify(accounts, null, 2), cb);
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
