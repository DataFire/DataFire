let datafire = require('../index');
let SwaggerClient = require('./swagger-client');
let fs = require('fs');

const INTEGRATIONS = {};


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

  initialize(cb) {cb()}
}

class Integration {
  constructor(name) {
    this.name = name;
  }

  static new(name) {
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

}

class RESTIntegration extends Integration {
  constructor(name, spec) {
    super(name);
    this.spec = spec;
    this.client = new SwaggerClient({swagger: spec});
    for (let path in this.spec.paths) {
      for (let method in this.spec.paths[path]) {
        let opId = this.spec.paths[path][method].operationId;
        if (opId && this[opId] === undefined) {
          this[opId] = () => this.makeOperation(method, path);
        }
      }
    }
  }

  initialize(cb) {
    this.client.initialize((err) => {
      this.spec = this.client.swagger;
      this.client.authorize(this.account);
      cb(err);
    });
  }

  makeOperation(method, path) {
    if (!this.spec.paths[path]) throw new Error("Path " + path + " not found in " + this.name);
    if (!this.spec.paths[path][method]) throw new Error("Method " + method + " not found for path " + path);
    return new Operation(method, path, this)
  }

  get (path) {return this.makeOperation('get', path)}
  post (path) {return this.makeOperation('post', path)}
  put (path) {return this.makeOperation('put', path)}
  patch (path) {return this.makeOperation('patch', path)}
  delete (path) {return this.makeOperation('delete', path)}
  options (path) {return this.makeOperation('options', path)}
  head (path) {return this.makeOperation('head', path)}

  resolveOperation(str) {
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
}

module.exports = Integration;
