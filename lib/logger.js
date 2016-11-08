const chalk = require('chalk')

class Logger {
  static chalkOperation(op) {
    let str = Logger.chalkMethod(op.method) + '\t' + op.path;
    if (op.operation.operationId) str += '\n' + chalk.magenta(op.operation.operationId);
    if (op.operation.description) str += '\n' + chalk.gray(op.operation.description);
    return str;
  }

  static chalkMethod(method) {
    method = method.toUpperCase();
    if (method === 'GET') return chalk.green(method);
    if (method === 'PUT' || method === 'POST' || method === 'PATCH') return chalk.yellow(method);
    if (method === 'DELETE') return chalk.red(method);
    return method;
  }

  static chalkType(type) {
    type = type || 'string';
    if (type === 'string') return chalk.green(type);
    if (type === 'integer' || type === 'number') return chalk.blue(type);
    if (type === 'boolean') return chalk.yellow(type);
    if (type === 'array' || type === 'object') return chalk.magenta(type);
    return type;
  }

  static chalkCode(code) {
    if (code.startsWith('2')) return chalk.green(code);
    if (code.startsWith('3')) return chalk.yellow(code);
    if (code.startsWith('4')) return chalk.orange(code);
    if (code.startsWith('5')) return chalk.red(code);
  }

  static log(str) {
    console.log(str);
  }
}

module.exports = Logger;
