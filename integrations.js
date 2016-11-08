let fs = require('fs');
let request = require('request');
let chalk = require('chalk');
let columnify = require('columnify');

let logger = require('./lib/logger');
let datafire = require('./index');

const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const FILE_SUFFIX = '.openapi.json';

const MAX_DESCRIPTION_LENGTH = 100;

let integrations = module.exports = {};


let strcmp = (str1, str2) => {
  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
}
let sortOperations = (op1, op2) => {
  if (op1.path !== op2.path) return strcmp(op1.path, op2.path);
  return strcmp(op1.method, op2.method);
}

integrations.integrate = (args, cb) => {
  cb = cb || ((err) => {if (err) throw err});
  fs.mkdir('./integrations', (err) => {
    if (args.url) {
      integrateURL(args.as || args.name, args.url, cb);
    } else {
      if (args.name === 'hacker_news') return integrations.integrateFile(args.name, __dirname + '/integration_files/hacker_news.openapi.json');
      request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
        if (err) return cb(err);
        let keys = Object.keys(body);
        let validKeys = keys.filter(k => k.indexOf(args.name) !== -1);
        if (validKeys.length === 0) cb(new Error("API " + args.name + " not found"));
        let exactMatch = validKeys.filter(f => f === args.name)[0];
        if (validKeys.length > 1 && !exactMatch) cb(new Error("Ambiguous API name: " + args.name + "\n\nPlease choose one of:\n" + validKeys.join('\n')));
        let info = body[exactMatch || validKeys[0]];
        let url = info.versions[info.preferred].swaggerUrl;
        integrateURL(args.as || args.name, url, cb);
      })
    }
  })
}

integrations.integrateFile = (name, filename, cb) => {
  fs.readFile(filename, 'utf8', (err, data) => {
    if (err) return cb(err);
    let outFilename = datafire.integrationsDirectory + '/' + name + FILE_SUFFIX;
    fs.writeFile(outFilename, data, cb);
  });
}

let integrateURL = (name, url, cb) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    let filename = datafire.integrationsDirectory + '/' + name + FILE_SUFFIX;
    logger.log('Creating integration ' + filename.replace(process.cwd(), '.'));
    fs.writeFile(filename, JSON.stringify(body, null, 2), cb);
  })
}

integrations.list = (args, cb) => {
  cb = cb || ((err, data) => {
    if (err) throw err;
    logger.log(data.join("\n"));
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
  logger.log(chalk.gray(str));
}

integrations.describe = (args) => {
  let integration = new datafire.Integration(args.name || args.integration);
  integration.initialize(err => {
    let spec = integration.spec;
    logger.log('\n');
    if (!args.operation) {
      let url = spec.schemes[0] + '://' + spec.host + spec.basePath;
      logger.log(chalk.blue(url));
      logDescription(spec.info.description);
      logger.log('\n');
    }
    let opDescriptions = [];
    didLog = false;
    Object.keys(spec.paths).forEach(path => {
      Object.keys(spec.paths[path]).forEach(method => {
        let op = spec.paths[path][method];
        if (args.operation) {
          let fakeOpId = new RegExp('^\s*' + method + '\\s+' + path + '\s*$', 'i');
          if (args.operation !== op.operationId && !args.operation.match(fakeOpId)) {
            return;
          }
          integrations.describeOperation(method, path, op, args.operation ? true : false);
          logger.log();
          didLog = true;
        } else {
          opDescriptions.push({
            method: method,
            path: path,
            operation: op,
          })
        }
      });
    });
    if (args.operation) {
      if (!didLog) throw new Error("Operation " + args.operation + " not found");
    } else {
      opDescriptions.sort(sortOperations);
      opDescriptions.forEach(desc => {
        logger.log(logger.chalkOperation(desc) + '\n');
      })
    }
  });
}


let padString = (str, len) => {
  while (str.length < len) str += ' ';
  return str;
}

integrations.describeOperation = (method, path, op, verbose) => {
  logger.log(logger.chalkOperation({method, path, operation: op}) + '\n');
  let paramDescriptions = op.parameters.map(p => {
    let ret = {parameter: p.name};
    ret.type = logger.chalkType(p.in === 'body' ? 'object': p.type);
    ret.required = p.required ? chalk.red('yes') : '';
    ret.default = p.default;
    if (p.description) {
      ret.description = chalk.gray(p.description);
    }
    return ret;
  })
  logger.log(columnify(paramDescriptions, {
    columnSplitter: '  ',
    config: {
      description: {
        maxWidth: 80
      }
    }
  }));
  let bestCode = null;
  for (let code in op.responses) {
    if (code.startsWith('2') && (!bestCode || code < bestCode)) {
      bestCode = code;
    }
  }
  let logSchema = (schema, indent) => {
    indent = indent || '';
    if (schema.properties) {
      for (let propName in schema.properties) {
        let prop = schema.properties[propName];
        let toLog = indent + padString(propName + ': ', 14) + logger.chalkType(prop.type);
        if (prop.items && ! prop.items.properties) {
          toLog += '[' + logger.chalkType(prop.items.type) + ']'
        }
        logger.log(toLog);
        if (prop.properties) {
          logSchema(prop, indent + '  ')
        } else if (prop.items && prop.items.properties) {
          logSchema(schema.properties[prop].items, indent + '  ')
        }
      }
    }
  }
  logger.log('\nRESPONSE')
  logSchema(op.responses[bestCode].schema);
}
