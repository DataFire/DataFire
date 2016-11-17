'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = require('./logger');
var chalk = require('chalk');
var async = require('async');

var MAX_PARALLEL_REQUESTS = 10;

var Step = function () {
  function Step(name, opts) {
    _classCallCheck(this, Step);

    this.name = name;
    this.operation = opts.do;
    this.params = opts.params instanceof Function ? opts.params : function () {
      return opts.params;
    };
    this.finish = opts.finish || function () {};
    this.nextPage = opts.nextPage;
  }

  _createClass(Step, [{
    key: 'execute',
    value: function execute(data, callback) {
      logger.log(this.name);
      if (this.operation instanceof Function) {
        this.executeFunction(data, callback);
      } else {
        this.executeOperation(data, callback);
      }
    }
  }, {
    key: 'executeFunction',
    value: function executeFunction(data, callback) {
      var _this = this;

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
        this.operation(data, function (err, result) {
          if (err) {
            logger.logError('  Error: ' + err.message);
            return callback(err);
          }
          logger.logSuccess('  Success');
          data[_this.name] = result;
          _this.finish(data);
          callback();
        });
      }
    }
  }, {
    key: 'executeOperation',
    value: function executeOperation(data, callback) {
      var _this2 = this;

      logger.log('  operation: ' + chalk.magenta(this.operation.name));
      var args = this.params(data);
      var onResult = function onResult(err, result) {
        if (err) return callback(err);
        if (_this2.nextPage) {
          data[_this2.name] = data[_this2.name] || [];
          var oldLen = data[_this2.name].length;
          data[_this2.name] = data[_this2.name].concat(result);
          var newLen = data[_this2.name].length;
          if (newLen > oldLen) {
            args = _this2.nextPage(data, args);
            if (args) {
              _this2.callWithArgs(args, onResult);
              return;
            }
          }
        } else {
          data[_this2.name] = result;
        }
        _this2.finish(data);
        callback();
      };
      if (Array.isArray(args)) {
        async.parallelLimit(args.map(function (arg_set) {
          return function (acb) {
            _this2.callWithArgs(arg_set, acb);
          };
        }), MAX_PARALLEL_REQUESTS, onResult);
      } else {
        this.callWithArgs(args, onResult);
      }
    }
  }, {
    key: 'callWithArgs',
    value: function callWithArgs(args, callback) {
      this.operation.validateArgs(args);
      this.operation.call(args || {}, function (err, response) {
        if (err) {
          logger.logError('  Error: ' + err.message);
          return callback(err);
        }
        var msg = '';
        if (Array.isArray(response)) msg = ': got ' + response.length + ' items';
        logger.logSuccess('  Success' + msg);
        callback(null, response);
      });
    }
  }]);

  return Step;
}();

module.exports = Step;