const chalk = require('chalk');
const columnify = require('columnify');
const prettyjson = require('prettyjson');

const MAX_DESCRIPTION_LENGTH = 100;

class Logger {
  static stripHtml(str) {
    str = str || '';
    return str.replace(/<(?:.|\n)*?>/gm, '');
  }

  static chalkOperation(method, path, operationId, desc) {
    let str = Logger.chalkMethod(method) + '\t' + path;
    if (operationId) str += '\n' + chalk.magenta(operationId);
    if (desc) str += '\n' + chalk.gray(desc);
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

  static padString(str, len) {
    while (str.length < len) str += ' ';
    return str;
  }

  static logColumns(cols, options) {
    options = options || {};
    options.columnSplitter = '  ';
    Logger.log(columnify(cols, options));
  }

  static logJSON(json) {
    Logger.log(prettyjson.render(json, {keysColor: 'blue'}));
  }

  static logSchema(schema, indent, name) {
    indent = indent || '';
    if (indent.length > 20) return Logger.log('...\n\n')
    let toLog = name ? indent + Logger.padString(name + ': ', 14) + Logger.chalkType(schema.type) : '';
    if (schema.properties) {
      if (toLog) Logger.log(toLog);
      for (let propName in schema.properties) {
        let prop = schema.properties[propName];
        Logger.logSchema(prop, indent + '  ', propName);
      }
    } else if (schema.items) {
      if (schema.items.properties || schema.items.items) {
        if (toLog) Logger.log(toLog);
        Logger.logSchema(schema.items, indent + '  ', 'items')
      } else {
        toLog = toLog || indent + Logger.chalkType('array');
        toLog += '[' + Logger.chalkType(schema.items.type) + ']';
        Logger.log(toLog);
      }
    } else {
      if (toLog) Logger.log(toLog);
    }
  }

  static logOperation(method, path, op) {
    Logger.log(Logger.chalkOperation(method, path, op.operationId, op.summary || op.description));
  }

  static logDescription(str) {
    if (!str) return;
    str = Logger.stripHtml(str);
    let newline = str.indexOf('\n');
    if (newline !== -1) str = str.substring(0, newline);
    if (str.length > MAX_DESCRIPTION_LENGTH) {
      str = str.substring(0, MAX_DESCRIPTION_LENGTH) + '...';
    }
    Logger.log(chalk.gray(str.trim()));
  }

  static logParameters(parameters) {
    let paramDescriptions = parameters.map(p => {
      let ret = {parameter: p.name};
      ret.type = Logger.chalkType(p.in === 'body' ? 'object': p.type);
      ret.required = p.required ? chalk.red('yes') : '';
      ret.default = p.default;
      if (p.description) {
        ret.description = chalk.gray(p.description);
      }
      return ret;
    })
    Logger.log(columnify(paramDescriptions, {
      columnSplitter: '  ',
      config: {
        description: {
          maxWidth: 80
        }
      }
    }));
  }

  static logSuccess(str) {
    str = str || 'Success';
    Logger.log(chalk.green(str));
  }
  static logError(str) {
    str = str || 'Error';
    Logger.log(chalk.red(str));
  }

  static log(str) {
    if (str === undefined) str = '';
    console.log(str);
  }
}

module.exports = Logger;
