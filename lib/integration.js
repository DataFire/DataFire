let datafire = require('../index');
let SwaggerClient = require('./swagger-client');

class Operation {
  constructor(method, path, integration) {
    this.method = method.toLowerCase();
    this.path = path;
    this.integration = integration;
  }

  resolve() {
    let opSet = this.integration.spec.paths[path];
    if (!opSet) throw new Error("Path " + path + " not found in " + this.name);
    let op = opSet[method];
    if (!op) throw new Error("Method " + method + " not found for path " + path + " in " + this.name);
    return op;
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
    this.client.initialize(cb);
  }

  operation(method, path) {
    return new Operation(method, path, op)
  }

  get(path) {return this.operation('get', path)}
  post(path) {return this.operation('post', path)}
  put(path) {return this.operation('put', path)}
  patch(path) {return this.operation('patch', path)}
  delete(path) {return this.operation('delete', path)}
  options(path) {return this.operation('options', path)}
  head(path) {return this.operation('head', path)}

  as(account) {
    let dir = datafire.credentialsDirectory;
    this.credentials = require(dir + '/' + name + '.json')[account];
    this.client.authorize(this.credentials);
  }
}
