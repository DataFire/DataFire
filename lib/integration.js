let datafire = require('../index');
let SwaggerClient = require('./swagger-client');

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
    let dir = datafire.integrationsDirectory;
    try {
      this.spec = require(dir + '/' + name + '.openapi.json');
    } catch(e) {
      throw new Error("Integration " + name + " not found");
    }
    this.client = new SwaggerClient({swagger: this.spec});
    for (let path in this.spec.paths) {
      for (let method in this.spec.paths[path]) {
        let opId = this.spec.paths[path][method].operationId;
        if (opId && this[opId] === undefined) {
          this[opId] = () => this.operation(method, path);
        }
      }
    }
  }

  initialize(cb) {
    this.client.initialize((err) => {
      this.spec = this.client.swagger;
      cb(err);
    });
  }

  resolveOperation(str) {
    let ret = null;
    Object.keys(this.spec.paths).forEach(path => {
      Object.keys(this.spec.paths[path]).forEach(method => {
        let op = this.spec.paths[path][method];
        let fakeOpId = new RegExp('^\s*' + method + '\\s+' + path + '\s*$', 'i');
        if (str === op.operationId || str.match(fakeOpId)) {
          ret = this.operation(method, path);
        }
      })
    })
    return ret;
  }

  operation(method, path) {
    if (!this.spec.paths[path]) throw new Error("Path " + path + " not found in " + this.name);
    if (!this.spec.paths[path][method]) throw new Error("Method " + method + " not found for path " + path);
    return new Operation(method, path, this)
  }

  get(path) {return this.operation('get', path)}
  post(path) {return this.operation('post', path)}
  put(path) {return this.operation('put', path)}
  patch(path) {return this.operation('patch', path)}
  delete(path) {return this.operation('delete', path)}
  options(path) {return this.operation('options', path)}
  head(path) {return this.operation('head', path)}

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
    this.client.authorize(accounts[account]);
    return this;
  }
}

module.exports = Integration;
