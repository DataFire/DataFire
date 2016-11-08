let fs = require('fs');
let request = require('request');
let chalk = require('chalk');

let logger = require('./lib/logger');
let datafire = require('./index');

const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const FILE_SUFFIX = '.openapi.json';

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

integrations.list = (args) => {
  if (args.all) {
    request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
      if (err) throw err;
      let keys = Object.keys(body);
      keys.forEach(k => {
        let api = body[k];
        api = api.versions[api.preferred];
        logger.log(chalk.magenta(k));
        logger.logDescription(api.info.description);
        logger.log();
      });
    });
  } else {
    fs.readdir(datafire.integrationsDirectory, (err, files) => {
      if (err) return cb(err);
      files.forEach(f => {
        let name = f.substring(0, f.length - FILE_SUFFIX.length);
        logger.log(chalk.magenta(name));
      })
    })
  }
}

integrations.describe = (args) => {
  let integration = new datafire.Integration(args.name || args.integration);
  integration.initialize(err => {
    if (err) throw err;
    let spec = integration.spec;
    logger.log();
    if (!args.operation) {
      let url = spec.schemes[0] + '://' + spec.host + spec.basePath;
      logger.log(chalk.blue(spec.info.title));
      logger.log(chalk.blue(url));
      logger.logDescription(spec.info.description);
      logger.log();
      integrations.describeOperations(spec);
    } else {
      let operation = integration.resolveOperation(args.operation);
      integrations.describeOperation(operation.method, operation.path, operation.resolve());
    }
  });
}

integrations.describeOperations = (spec) => {
  let opDescriptions = [];
  Object.keys(spec.paths).forEach(path => {
    Object.keys(spec.paths[path]).forEach(method => {
      let op = spec.paths[path][method];
      opDescriptions.push({
        method: method,
        path: path,
        operation: op,
      })
    });
  });
  opDescriptions.sort(sortOperations);
  opDescriptions.forEach(desc => {
    logger.logOperation(desc.method, desc.path, desc.operation);
    logger.log();
  })
}


integrations.describeOperation = (method, path, op) => {
  logger.logOperation(method, path, op);
  logger.log();
  logger.logParameters(op.parameters);
  let bestCode = null;
  for (let code in op.responses) {
    if (code.startsWith('2') && (!bestCode || code < bestCode)) {
      bestCode = code;
    }
  }
  logger.log('\nRESPONSE')
  logger.logSchema(op.responses[bestCode].schema);
}
