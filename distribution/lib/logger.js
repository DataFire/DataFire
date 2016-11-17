'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var chalk = require('chalk');
var columnify = require('columnify');
var prettyjson = require('prettyjson');

var MAX_DESCRIPTION_LENGTH = 100;

var Logger = function () {
  function Logger() {
    _classCallCheck(this, Logger);
  }

  _createClass(Logger, null, [{
    key: 'stripHtml',
    value: function stripHtml(str) {
      str = str || '';
      return str.replace(/<(?:.|\n)*?>/gm, '');
    }
  }, {
    key: 'chalkOperation',
    value: function chalkOperation(name, op, skipDescription) {
      var str = chalk.magenta(name);
      if (op.method && op.path) {
        if (name === op.method.toUpperCase() + ' ' + op.path) str = '';
        str += '\n' + Logger.chalkMethod(op.method) + '\t' + op.path;
      }
      if (!skipDescription) {
        var desc = op.description || op.summary;
        if (desc) str += '\n' + chalk.gray(Logger.stripHtml(desc));
      }
      return str;
    }
  }, {
    key: 'chalkMethod',
    value: function chalkMethod(method) {
      method = method.toUpperCase();
      if (method === 'GET') return chalk.green(method);
      if (method === 'PUT' || method === 'POST' || method === 'PATCH') return chalk.yellow(method);
      if (method === 'DELETE') return chalk.red(method);
      return method;
    }
  }, {
    key: 'chalkType',
    value: function chalkType(type) {
      type = type || 'string';
      if (type === 'string') return chalk.green(type);
      if (type === 'integer' || type === 'number') return chalk.blue(type);
      if (type === 'boolean') return chalk.yellow(type);
      if (type === 'array' || type === 'object') return chalk.magenta(type);
      return type;
    }
  }, {
    key: 'chalkCode',
    value: function chalkCode(code) {
      if (code.startsWith('2')) return chalk.green(code);
      if (code.startsWith('3')) return chalk.yellow(code);
      if (code.startsWith('4')) return chalk.orange(code);
      if (code.startsWith('5')) return chalk.red(code);
    }
  }, {
    key: 'padString',
    value: function padString(str, len) {
      while (str.length < len) {
        str += ' ';
      }return str;
    }
  }, {
    key: 'logColumns',
    value: function logColumns(cols, options) {
      options = options || {};
      options.columnSplitter = '  ';
      Logger.log(columnify(cols, options));
    }
  }, {
    key: 'logJSON',
    value: function logJSON(json) {
      Logger.log(prettyjson.render(json, { keysColor: 'blue' }));
    }
  }, {
    key: 'logSchema',
    value: function logSchema(schema, indent, name) {
      indent = indent || '';
      if (indent.length > 12) return Logger.log('...\n\n');
      var toLog = name ? indent + Logger.padString(name + ': ', 14) : '';
      toLog += Logger.chalkType(schema.properties ? 'object' : schema.type);
      if (schema.items) {
        toLog += '[' + Logger.chalkType(schema.items.type) + ']';
      }
      if (schema.description) {
        var desc = chalk.gray(Logger.truncate(schema.description, 60));
        toLog += '\n' + indent + desc + '\n';
      }
      if (schema.properties) {
        if (toLog) Logger.log(toLog);
        for (var propName in schema.properties) {
          var prop = schema.properties[propName];
          Logger.logSchema(prop, indent + '  ', propName);
        }
      } else if (schema.items) {
        if (schema.items.properties || schema.items.items) {
          if (toLog) Logger.log(toLog);
          Logger.logSchema(schema.items, indent + '  ', 'items');
        } else {
          toLog = toLog || indent + Logger.chalkType('array');
          Logger.log(toLog);
        }
      } else {
        if (toLog) Logger.log(toLog);
      }
    }
  }, {
    key: 'logIntegration',
    value: function logIntegration(name, spec) {
      Logger.log(chalk.magenta(name));
      if (spec.info.title) Logger.log(chalk.blue(spec.info.title));
      Logger.logDescription(spec.info.description);
    }
  }, {
    key: 'logOperation',
    value: function logOperation(name, op) {
      Logger.log(Logger.chalkOperation(name, op));
    }
  }, {
    key: 'truncate',
    value: function truncate(str, len) {
      if (str.length > len) {
        str = str.substring(0, len - 3) + '...';
      }
      return str;
    }
  }, {
    key: 'logDescription',
    value: function logDescription(str) {
      if (!str) return;
      str = Logger.stripHtml(str);
      var newline = str.indexOf('\n');
      if (newline !== -1) str = str.substring(0, newline);
      str = Logger.truncate(str.trim(), MAX_DESCRIPTION_LENGTH);
      Logger.log(chalk.gray(str));
    }
  }, {
    key: 'logParameters',
    value: function logParameters(parameters) {
      if (!parameters || !parameters.length) {
        Logger.log('No parameters');
        return;
      };
      var requestSchema = null;
      var paramDescriptions = parameters.map(function (p) {
        var ret = { parameter: p.name };
        ret.type = Logger.chalkType(p.in === 'body' ? 'object' : p.type);
        ret.required = p.required ? chalk.red('yes') : '';
        ret.default = p.default;
        if (p.description) {
          ret.description = chalk.gray(p.description);
        }
        if (p.enum) {
          if (ret.description) ret.description += ' | ';else ret.description = '';
          ret.description += chalk.gray('One of: ') + p.enum.map(function (n) {
            return chalk.yellow(n);
          }).join(', ');
        }
        if (p.schema) requestSchema = p.schema;
        return ret;
      });
      Logger.log(columnify(paramDescriptions, {
        columnSplitter: '  ',
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
  }, {
    key: 'logFlow',
    value: function logFlow(flow) {
      Logger.log(chalk.magenta(flow.name));
      Logger.log(chalk.gray(flow.description));
      flow.steps.forEach(function (step) {
        var opName = step.operation instanceof Function ? '(custom)' : step.operation.integration.name + ' -> ' + step.operation.name;
        console.log('  ' + chalk.blue(step.name) + ': ' + chalk.yellow(opName));
      });
    }
  }, {
    key: 'logURL',
    value: function logURL(str) {
      Logger.log('\n' + chalk.yellow(str) + '\n');
    }
  }, {
    key: 'logSuccess',
    value: function logSuccess(str) {
      str = str || 'Success';
      Logger.log(chalk.green(str));
    }
  }, {
    key: 'logError',
    value: function logError(str) {
      str = str || 'Error';
      Logger.log(chalk.red(str));
    }
  }, {
    key: 'log',
    value: function log(str) {
      if (Logger.silent) return;
      if (str === undefined) str = '';
      console.log(str);
    }
  }]);

  return Logger;
}();

module.exports = Logger;