let datafire = require('../index');
let SwaggerClient = require('./swagger-client');
let fs = require('fs');

const INTEGRATIONS = {};


class Operation {
  constructor(name, integration) {
    this.name = name;
    this.integration = integration;
  }

  call(args, cb) {
    throw new Error("Call not implemented");
  }
}

class RESTOperation extends Operation {
  constructor(method, path, op, integration) {
    super(op.operationId || (method.toUpperCase() + ' ' + path), integration);
    this.method = method;
    this.path = path;
    this.details = op;
  }

  call(args, cb) {
    return this.integration.client.request(this.method, this.path, args, cb);
  }
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

  initialize(cb) {cb()}

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
    if (!this[str]) throw new Error("Operation " + str + " not found in " + this.name);
    return this[str]();
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
    return new RESTOperation(method, path, this.spec.paths[path][method], this)
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
