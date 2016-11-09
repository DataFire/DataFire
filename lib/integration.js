let datafire = require('../index');
let SwaggerClient = require('./swagger-client');
let fs = require('fs');

const INTEGRATIONS = {};

let getIntegration = (name) => {
  if (INTEGRATIONS[name]) return INTEGRATIONS[name];
  fs.readdirSync(datafire.integrationsDirectory).forEach(f => {
    if (f.startsWith(name + '.')) {
      INTEGRATIONS[name] = require(datafire.integrationsDirectory+ '/' + f);
    }
  });
  if (!INTEGRATIONS[name]) throw new Error("Integration " + name + " not found");
  return INTEGRATIONS[name];
}

class Operation {
  constructor(method, path, integration) {
    this.method = method.toLowerCase();
    this.path = path;
    this.integration = integration;
  }

  resolve() {
    let opSet = this.integration.spec.paths[this.path];
    if (!opSet) throw new Error("Path " + this.path + " not found in " + this.name);
    let op = opSet[this.method];
    if (!op) throw new Error("Method " + this.method + " not found for path " + this.path + " in " + this.name);
    return op;
  }

  request(answers, cb) {
    return this.integration.client.request(this.method, this.path, answers, cb);
  }
}

class Integration {
  constructor(name) {
    this.name = name;
    this.spec = getIntegration(name);
    if (this.spec.swagger) {
      this.initOpenAPIIntegration();
    } else {
      this.initCustomIntegration();
    }
  }

  initCustomIntegration() {
    for (let opId in this.spec.operations) {
      this[op] = () => this.makeOperation(this.spec.operations[opId]);
    }
  }

  initOpenAPIIntegration() {
    this.client = new SwaggerClient({swagger: this.spec});
    for (let path in this.spec.paths) {
      for (let method in this.spec.paths[path]) {
        let opId = this.spec.paths[path][method].operationId;
        if (opId && this[opId] === undefined) {
          this[opId] = () => this.makeOperation(method, path);
        }
      }
    }
    this.get = (path) => {return this.makeOperation('get', path)}
    this.post = (path) => {return this.makeOperation('post', path)}
    this.put = (path) => {return this.makeOperation('put', path)}
    this.patch = (path) => {return this.makeOperation('patch', path)}
    this.delete = (path) => {return this.makeOperation('delete', path)}
    this.options = (path) => {return this.makeOperation('options', path)}
    this.head = (path) => {return this.makeOperation('head', path)}
  }

  resolveOperation(str) {
    if (!this.spec.swagger) {
      return this[str]();
    }
    let ret = null;
    Object.keys(this.spec.paths).forEach(path => {
      Object.keys(this.spec.paths[path]).forEach(method => {
        let op = this.spec.paths[path][method];
        let fakeOpId = new RegExp('^\s*' + method + '\\s+' + path + '\s*$', 'i');
        if (str === op.operationId || str.match(fakeOpId)) {
          ret = this.makeOperation(method, path);
        }
      })
    })
    return ret;
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

  makeOperation(method, path) {
    if (!this.spec.paths[path]) throw new Error("Path " + path + " not found in " + this.name);
    if (!this.spec.paths[path][method]) throw new Error("Method " + method + " not found for path " + path);
    return new Operation(method, path, this)
  }

  initialize(cb) {
    if (this.spec.swagger) {
      this.client.initialize((err) => {
        this.spec = this.client.swagger;
        this.client.authorize(this.account);
        cb(err);
      });
    } else {
      if (this.account) {
        this.spec.authorize(this.account, cb);
      } else {
        cb();
      }
    }
  }
}

module.exports = Integration;
