let datafire = require('../index');
let SwaggerClient = require('./swagger-client');
let fs = require('fs');

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
    this.operations = {};
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

class RESTIntegration extends Integration {
  constructor(name, spec) {
    super(name);
    this.spec = spec;
    this.client = new SwaggerClient({swagger: spec});
    for (let path in this.spec.paths) {
      for (let method in this.spec.paths[path]) {
        let op = new RESTOperation(method, path, this.spec.paths[path][method], this);
        this.addOperation(op);
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

  get (path)     {return this.resolveOperation('get ' + path)}
  post (path)    {return this.resolveOperation('post ' + path)}
  put (path)     {return this.resolveOperation('put ' + path)}
  patch (path)   {return this.resolveOperation('patch ' + path)}
  delete (path)  {return this.resolveOperation('delete ' + path)}
  options (path) {return this.resolveOperation('options ' + path)}
  head (path)    {return this.resolveOperation('head ' + path)}

  resolveOperation(str) {
    for (let opId in this.operations) {
      let op = this.operations[opId];
      let fakeOpId = new RegExp('^\s*' + op.method + '\\s+' + op.path + '\s*$', 'i');
      if (str === op.details.operationId || str.match(fakeOpId)) {
        return op;
      }
    }
  }
}

module.exports = Integration;
