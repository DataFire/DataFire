const logger = require('./logger');
const chalk = require('chalk');
const async = require('async');

const MAX_PARALLEL_REQUESTS = 10;

class Step {
  constructor(name, opts) {
    this.name = name;
    this.operation = opts.do;
    this.params = opts.params instanceof Function ? opts.params : () => opts.params;
    this.finish = opts.finish || (() => {});
    this.nextPage = opts.nextPage;
  }

  execute(data, callback) {
    logger.log(this.name);
    if (this.operation instanceof Function) {
      this.executeFunction(data, callback);
    } else {
      this.executeOperation(data, callback);
    }
  }

  executeFunction(data, callback) {
    logger.log('  operation: ' + chalk.magenta('custom'));
    const handleError = e => {
      logger.logError('  Error: ' + e.message);
      callback(e);
    }
    if (this.operation.length <= 1) {
      try {
        data[this.name] = this.operation(data);
        this.finish(data);
      } catch (e) {
        return handleError(e);
      }
      logger.logSuccess('  Success');
      callback();
    } else {
      try {
        this.operation(data, (err, result) => {
          if (err) {
            return handleError(err);
          }
          logger.logSuccess('  Success');
          data[this.name] = result;
          this.finish(data);
          callback();
        })
      } catch (e) {
        return handleError(e);
      }
    }
  }

  executeOperation(data, callback) {
    logger.log('  operation: ' + chalk.magenta(this.operation.name));
    let args = this.params(data);
    let onResult = (err, result) => {
      if (err) return callback(err);
      if (this.nextPage) {
        data[this.name] = data[this.name] || [];
        let oldLen = data[this.name].length;
        data[this.name] = data[this.name].concat(result);
        let newLen = data[this.name].length;
        if (newLen > oldLen) {
          args = this.nextPage(data, args);
          if (args) {
            this.callWithArgs(args, onResult);
            return;
          }
        }
      } else {
        data[this.name] = result;
      }
      this.finish(data);
      callback();
    }
    if (Array.isArray(args)) {
      async.parallelLimit(args.map(arg_set => {
        return acb => {
          this.callWithArgs(arg_set, acb);
        }
      }), MAX_PARALLEL_REQUESTS, onResult);
    } else {
      this.callWithArgs(args, onResult);
    }
  }

  callWithArgs(args, callback) {
    this.operation.validateArgs(args);
    this.operation.call(args || {}, (err, response) => {
      if (err) {
        logger.logError('  Error: ' + err.message);
        return callback(err);
      }
      let msg = '';
      if (Array.isArray(response)) msg = ': got ' + response.length + ' items';
      logger.logSuccess('  Success' + msg);
      callback(null, response);
    })
  }
}

module.exports = Step;
