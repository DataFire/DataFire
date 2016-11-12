let Operation = require('./operation');
let Integration = require('./integration.js');
let SwaggerClient = require('./swagger-client');

const METHODS = ['get', 'put', 'post', 'patch', 'delete', 'options', 'head'];

const getID = op => {
  return op.operationId || (op.method.toUpperCase() + ' ' + op.path);
}

class RESTOperation extends Operation {
  constructor(info, integration) {
    super(getID(info), integration);
  }

  call(args, cb) {
    return this.integration.client.request(this.info.method, this.info.path, args, (err, data) => {
      if (err) {
        if (err instanceof Error) return cb(err);
        let message = err.statusCode;
        if (data) message += '\n' + JSON.stringify(data, null, 2);
        return cb(new Error(message));
      }
      cb(null, data);
    });
  }
}

class RESTIntegration extends Integration {
  constructor(name, spec) {
    spec.operations = {};
    for (let path in spec.paths) {
      for (let method in spec.paths[path]) {
        if (method === 'parameters') continue;
        let op = spec.paths[path][method];
        op.method = method;
        op.path = path;
        let bestCode = null;
        for (let code in op.responses) {
          if (code.startsWith('2') && (!bestCode || code < bestCode)) {
            bestCode = code;
          }
        }
        if (!bestCode) {
          op.response = {description: 'OK'}
        } else {
          op.response = op.responses[bestCode];
        }
        spec.operations[getID(op)] = op;
      }
    }
    super(name, spec);
    METHODS.forEach(m => {
      this[m] = path => {
        let op = this.spec.paths[path][m];
        return this.makeOperation(getID(op), op);
      }
    })
    this.client = new SwaggerClient({swagger: spec});
  }

  initialize(cb) {
    this.client.initialize((err) => {
      this.spec = this.client.swagger;
      this.client.authorize(this.account);
      cb(err);
    });
  }

  makeOperation(name, opSpec) {
    return new RESTOperation(opSpec, this)
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
