let fs = require('fs');
let request = require('request');
let chalk = require('chalk');
let columnify = require('columnify');

let datafire = require('./index');

const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const FILE_SUFFIX = '.openapi.json';

const MAX_DESCRIPTION_LENGTH = 100;

let integrations = module.exports = {};

integrations.integrate = (args, cb) => {
  cb = cb || ((err) => {if (err) throw err});

  if (args.url) {
    integrateURL(args.name, args.url, cb);
  } else {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) return cb(err);
      let keys = Object.keys(body);
      let validKeys = keys.filter(k => k.indexOf(args.name) !== -1);
      if (validKeys.length === 0) cb(new Error("API " + args.name + " not found"));
      if (validKeys.length > 1) cb(new Error("Ambiguous API name: " + args.name + "\n\nPlease choose one of:\n" + validKeys.join('\n')));
      let info = body[validKeys[0]];
      let url = info.versions[info.preferred].swaggerUrl;
      integrateURL(args.name, url, cb);
    })
  }
}

let integrateURL = (name, url, cb) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    fs.writeFile(datafire.integrationsDirectory + '/' + name + FILE_SUFFIX, JSON.stringify(body, null, 2), cb);
  })
}

integrations.list = (args, cb) => {
  cb = cb || ((err, data) => {
    if (err) throw err;
    console.log(data.join("\n"));
  })
  if (args.all) {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) return cb(err);
      let keys = Object.keys(body);
      cb(null, keys);
    });
  } else {
    fs.readdir(datafire.integrationsDirectory, (err, files) => {
      if (err) return cb(err);
      cb(null, files.map(f => f.substring(0, f.length - FILE_SUFFIX.length)))
    })
  }
}

let logDescription = (str) => {
  if (!str) return;
  if (str.length > MAX_DESCRIPTION_LENGTH) {
    str = str.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
  }
  console.log(chalk.gray(str));
}

integrations.describe = (args) => {
  let integration = new datafire.Integration(args.name);
  integration.initialize(err => {
    let spec = integration.spec;
    console.log('\n');
    if (!args.operation) {
      let url = spec.schemes[0] + '://' + spec.host + spec.basePath;
      console.log(chalk.blue(url));
      logDescription(spec.info.description);
      console.log('\n');
    }
    Object.keys(spec.paths).forEach(path => {
      Object.keys(spec.paths[path]).forEach(method => {
        let op = spec.paths[path][method];
        if (args.operation) {
          let fakeOpId = new RegExp(method + '\\s+' + path, 'i');
          if (args.operation !== op.operationId && !args.operation.match(fakeOpId)) {
            return;
          }
        }
        integrations.describeOperation(method, path, op, args.operation ? true : false);
        console.log();
      });
    });
  });
}

let chalkMethod = (method) => {
  method = method.toUpperCase();
  if (method === 'GET') return chalk.green(method);
  if (method === 'PUT' || method === 'POST' || method === 'PATCH') return chalk.yellow(method);
  if (method === 'DELETE') return chalk.red(method);
  return method;
}

let chalkType = (type) => {
  type = type || 'string';
  if (type === 'string') return chalk.green(type);
  if (type === 'integer' || type === 'number') return chalk.blue(type);
  if (type === 'boolean') return chalk.yellow(type);
  if (type === 'array' || type === 'object') return chalk.magenta(type);
  return type;
}

integrations.describeOperation = (method, path, op, verbose) => {
  console.log(chalkMethod(method) + '\t' + path);
  if (op.operationId) console.log(op.operationId);
  if (!verbose) {
    logDescription(op.description);
    return;
  }
  console.log(chalk.gray(op.description));
  console.log()
  let paramDescriptions = op.parameters.map(p => {
    let ret = {parameter: p.name};
    ret.type = chalkType(p.in === 'body' ? 'object': p.type);
    if (p.description) {
      ret.description = chalk.gray(p.description);
    }
    return ret;
  })
  console.log(columnify(paramDescriptions, {
    config: {
      description: {
        maxWidth: 80
      }
    }
  }));
}
