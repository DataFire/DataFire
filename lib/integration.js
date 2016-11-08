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
    this.spec = require(dir + '/' + name + '.openapi.json');
    this.client = new SwaggerClient({swagger: this.spec});
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
    } catch (e) {
      throw new Error("Credentials not found for " + this.name + ". Please run:\ndatafire authenticate " + this.name)
    }
    if (!accounts[account]) throw new Error("Account " + account + " not found for " + this.name);
    this.client.authorize(accounts[account]);
  }
}

module.exports = Integration;
