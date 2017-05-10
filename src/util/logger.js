const chalk = require('chalk');
const columnify = require('columnify');
const prettyjson = require('prettyjson');

const MAX_DESCRIPTION_LENGTH = 100;

class Logger {
  static stripHtml(str) {
    str = str || '';
    return str.replace(/<(?:.|\n)*?>/gm, '');
  }

  static chalkAction(name, op, skipDescription) {
    let str = chalk.magenta(name);
    if (!skipDescription) {
      let desc = op.description;
      if (desc) str += '\n' + chalk.gray(Logger.stripHtml(desc));
    }
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
    if (typeof type !== 'string') {
      if (type.properties) type = 'object';
      else if (type.items) type = 'array';
      else type = type.type;
    }
    type = type || 'string';
    if (type === 'string') return chalk.green(type);
    if (type === 'integer' || type === 'number') return chalk.blue(type);
    if (type === 'boolean') return chalk.cyan(type);
    if (type === 'array' || type === 'object') return chalk.yellow(type);
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

  static logHeading(str) {
    Logger.log(chalk.magenta(str));
  }

  static logColumns(cols, options) {
    options = options || {};
    options.columnSplitter = '  ';
    Logger.log(columnify(cols, options));
  }

  static logJSON(json) {
    if (json === undefined) return;
    Logger.log(prettyjson.render(json, {keysColor: 'white', stringColor: 'green', dashColor: 'white'}));
  }

  static logSchema(schema, indent, name) {
    indent = indent || '';
    if (indent.length > 12) return Logger.log('...\n\n')
    let toLog = indent;
    if (name) toLog += chalk.white(Logger.padString(name + ': ', 14));
    toLog += Logger.chalkType(schema);
    if (schema.items) {
      toLog += '[' + Logger.chalkType(schema.items) + ']';
    }
    if (schema.description) {
      let desc = chalk.gray(Logger.truncate(schema.description, 60, true));
      toLog += '\n' + indent + desc + '\n';
    }
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
        Logger.log(toLog);
      }
    } else {
      if (toLog) Logger.log(toLog);
    }
  }

  static logIntegration(name, spec) {
    Logger.log(chalk.magenta(name));
    if (spec.info.title) Logger.log('  ' + chalk.blue(spec.info.title));
    Logger.logDescription(spec.info.description, '  ');
  }

  static logAction(name, op) {
    Logger.log(Logger.chalkAction(name, op));
  }

  static truncate(str, len, chomp) {
    if (chomp) {
      let newline = str.indexOf('\n');
      if (newline !== -1) str = str.substring(0, newline);
    }
    if (str.length > len) {
      str = str.substring(0, len - 3) + '...';
    }
    return str;
  }

  static logDescription(str, indent) {
    if (!str) return;
    indent = indent || '';
    str = Logger.stripHtml(str);
    str = Logger.truncate(str.trim(), MAX_DESCRIPTION_LENGTH, true);
    Logger.log(indent + chalk.gray(str));
  }

  static logParameters(parameters) {
    if (!parameters || !parameters.length) {
      Logger.log('No parameters');
      return;
    };
    let requestSchema = null;
    let paramDescriptions = parameters.map(p => {
      let ret = {parameter: p.name};
      ret.type = Logger.chalkType(p.in === 'body' ? 'object': p.type);
      ret.required = p.required ? chalk.red('required') : '';
      if (p.description) {
        ret.description = chalk.gray(p.description);
      }
      if (p.enum) {
        if (ret.description) ret.description += ' | ';
        else ret.description = '';
        ret.description += chalk.gray('One of: ') + p.enum.map(n => chalk.yellow(n)).join(', ');
      }
      if (p.schema) requestSchema = p.schema;
      return ret;
    })
    Logger.log('Parameters');
    Logger.log(columnify(paramDescriptions, {
      columnSplitter: '  ',
      showHeaders: false,
      config: {
        description: {
          maxWidth: 80
        }
      }
    }));
    if (requestSchema) {
      Logger.log('\nRequest body');
      Logger.logSchema(requestSchema);
    }
  }

  static logResponse(response) {
    if (!response || !response.schema) return;
    Logger.log('Response body');
    Logger.logSchema(response.schema);
  }

  static logFlow(flow) {
    Logger.log(chalk.magenta(flow.name));
    Logger.log(chalk.gray(flow.description));
    flow.steps.forEach(step => {
      let opName = step.operation instanceof Function ? '(custom)' :
            step.operation.integration.name + ' -> ' + step.operation.name;
      console.log('  ' + chalk.blue(step.name) + ': ' + chalk.yellow(opName));
    })
  }

  static logURL(str) {
    Logger.log('\n' + chalk.yellow(str) + '\n');
  }

  static logSuccess(str) {
    str = str || 'Success';
    Logger.log(chalk.green(str));
  }
  static logInfo(str) {
    Logger.log(chalk.blue(str));
  }
  static logError(str) {
    str = str || 'Error';
    Logger.log(chalk.red(str));
  }

  static log(str) {
    if (Logger.silent) return;
    if (str === undefined) str = '';
    console.log(str);
  }
}

module.exports = Logger;
