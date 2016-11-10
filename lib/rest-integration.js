let Operation = require('./operation');
let Integration = require('./integration.js');
let SwaggerClient = require('./swagger-client');

class RESTOperation extends Operation {
  constructor(method, path, integration) {
    let name = method.toUpperCase() + ' ' + path;
    let info = integration.getOperationDetails(name);
    name = info.operationId || name;
    super(name, integration);
  }

  call(args, cb) {
    return this.integration.client.request(this.info.method, this.info.path, args, cb);
  }
}

class RESTIntegration extends Integration {
  constructor(name, spec) {
    spec.operations = {};
    for (let path in spec.paths) {
      for (let method in spec.paths[path]) {
        let op = spec.paths[path][method];
        op.method = method;
        op.path = path;
        let bestCode = null;
        for (let code in op.responses) {
          if (code.startsWith('2') && (!bestCode || code < bestCode)) {
            bestCode = code;
          }
        }
        op.response = op.responses[bestCode];
        let name = op.operationId || (method.toUpperCase() + ' ' + path);
        spec.operations[name] = op;
      }
    }
    super(name, spec);
    for (let opId in this.spec.operations) {
      let op = this.spec.operations[opId];
      if (op.operationId && this[op.operationId] === undefined) {
        this[op.operationId] = () => this.makeOperation(op.method, op.path);
      }
    }
    this.client = new SwaggerClient({swagger: spec});
  }

  initialize(cb) {
    this.client.initialize((err) => {
      this.spec = this.client.swagger;
      this.client.authorize(this.account);
      cb(err);
    });
  }

  get (path)     {return this.makeOperation('get', path)}
  post (path)    {return this.makeOperation('post', path)}
  put (path)     {return this.makeOperation('put', path)}
  patch (path)   {return this.makeOperation('patch', path)}
  delete (path)  {return this.makeOperation('delete', path)}
  options (path) {return this.makeOperation('options', path)}
  head (path)    {return this.makeOperation('head', path)}

  makeOperation(method, path) {
    return new RESTOperation(method, path, this)
  }

  resolveOperationId(str) {
    for (let opId in this.spec.operations) {
      let op = this.spec.operations[opId];
      let fakeOpId = new RegExp('^\s*' + op.method + '\\s+' + op.path + '\s*$', 'i');
      if (str === op.operationId || str.match(fakeOpId)) {
        return opId;
      }
    }
    throw new Error("Couldn't resolve operation " + str);
  }
}

RESTIntegration.RESTOperation = RESTOperation;
module.exports = RESTIntegration;
