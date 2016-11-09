const chalk = require('chalk');
const datafire = require('../index');
const logger = require('../lib/logger');

module.exports = (args) => {
  let integration = new datafire.Integration(args.integration);
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
      describeOperations(spec);
    } else {
      let operation = integration.resolveOperation(args.operation);
      describeOperation(operation.method, operation.path, operation.resolve());
    }
  });
}

let strcmp = (str1, str2) => {
  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
}
let sortOperations = (op1, op2) => {
  if (op1.path !== op2.path) return strcmp(op1.path, op2.path);
  return strcmp(op1.method, op2.method);
}

let describeOperations = (spec) => {
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


let describeOperation = (method, path, op) => {
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
  logger.log();
}

