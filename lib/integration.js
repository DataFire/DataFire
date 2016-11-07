let datafire = require('../index');

class Integration {
  constructor(name) {
    this.name = name;
    let dir = datafire.integrationsDirectory;
    this.spec = require(dir + '/' + name + '.openapi.json');
  }

  operation(method, path) {
    method = method.toLowerCase();
    let opSet = this.spec.paths[path];
    if (!opSet) throw new Error("Path " + path + " not found in " + this.name);
    let op = opSet[method];
    if (!op) throw new Error("Method " + method + " not found for path " + path + " in " + this.name);
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
  }
}
