const logger = require('./logger');
const chalk = require('chalk');
const async = require('async');

const MAX_PARALLEL_REQUESTS = 10;

class Step {
  constructor(name, operation, params, finish) {
    this.name = name;
    this.operation = operation;
    this.params = params instanceof Function ? params : () => params;
    this.finish = finish || (() => {});
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
    if (this.operation.length <= 1) {
      try {
        this.operation(data);
        this.finish(data);
      } catch (e) {
        logger.logError('  Error: ' + e.message);
        return callback(e);
      }
      logger.logSuccess('  Success');
      callback();
    } else {
      this.operation(data, (err, result) => {
        if (err) {
          logger.logError('  Error: ' + err.message);
          return callback(err);
        }
        logger.logSuccess('  Success');
        data[this.name] = result;
        this.finish(data);
        callback();
      })
    }
  }

  executeOperation(data, callback) {
    logger.log('  operation: ' + chalk.magenta(this.operation.name));
    let onResult = (err, result) => {
      if (err) return callback(err);
      data[this.name] = result;
      this.finish(data);
      callback();
    }
    let args = this.params(data);
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
