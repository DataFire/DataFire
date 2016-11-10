let Operation = require('./operation');
let Integration = require('./integration.js');
let SwaggerClient = require('./swagger-client');

class RESTOperation extends Operation {
  constructor(method, path, op, integration) {
    super(op.operationId || (method.toUpperCase() + ' ' + path), integration);
    this.method = method;
    this.path = path;
    this.info = op;
  }

  call(args, cb) {
    return this.integration.client.request(this.method, this.path, args, cb);
  }
}

class RESTIntegration extends Integration {
  constructor(name, spec) {
    super(name, spec);
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
      if (str === op.info.operationId || str.match(fakeOpId)) {
        return op;
      }
    }
  }
}

RESTIntegration.RESTOperation = RESTOperation;
module.exports = RESTIntegration;
