'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var async = require('async');
var logger = require('./logger');
var chalk = require('chalk');

var Operation = require('./operation');
var Step = require('./step');

var Flow = function () {
  function Flow(name, description) {
    _classCallCheck(this, Flow);

    this.name = name;
    this.description = description;
    this.initialized = false;
    this.steps = [];
    this.catches = [];
    this.integrations = [];
    this.params = {};
    this.handler = this.handler.bind(this); // Workaround for AWS Lamdba.
  }

  _createClass(Flow, [{
    key: 'setDefaults',
    value: function setDefaults(obj) {
      for (var key in obj) {
        this.params[key] = this.params[key] || obj[key];
      }
    }
  }, {
    key: 'setOptions',
    value: function setOptions(obj) {
      for (var key in obj) {
        this.params[key] = obj[key];
      }
    }
  }, {
    key: 'step',
    value: function step(name, operation, params, finish) {
      var opts = {};
      if ((typeof operation === 'undefined' ? 'undefined' : _typeof(operation)) === 'object' && !(operation instanceof Operation)) {
        opts = operation;
      } else {
        opts.do = operation;
        opts.params = params;
        opts.finish = finish;
      }
      this.steps.push(new Step(name, opts));
      if (!(opts.do instanceof Function) && this.integrations.indexOf(opts.do.integration) === -1) {
        this.integrations.push(opts.do.integration);
      }
      return this;
    }
  }, {
    key: 'asyncStep',
    value: function asyncStep() {
      throw new Error("not implemented");
    }
  }, {
    key: 'repeatStep',
    value: function repeatStep() {
      throw new Error("not implemented");
    }
  }, {
    key: 'catch',
    value: function _catch(fn) {
      this.catches.push({ index: this.steps.length, callback: fn });
      return this;
    }
  }, {
    key: 'getCatch',
    value: function getCatch(index) {
      return this.catches.filter(function (c) {
        return c.index > index;
      })[0];
    }
  }, {
    key: 'execute',
    value: function execute(callback) {
      var _this = this;

      callback = callback || function (e) {
        if (e) throw e;
      };

      var finish = function finish(err) {
        _this.destroyIntegrations(function (destroyErr) {
          return callback(err || destroyErr);
        });
      };

      this.executing = true;
      this.initializeIntegrations(function (err) {
        if (err) return finish(err);
        _this.initialized = true;
        _this.data = {};
        _this.executeFromStep(0, function (err) {
          if (err) return finish(err);
          if (_this.executing) _this.succeed("Success");
          finish();
        });
      });
    }
  }, {
    key: 'executeFromStep',
    value: function executeFromStep(index, callback) {
      var _this2 = this;

      if (!this.executing) return callback();
      if (index === this.steps.length) return callback();
      var step = this.steps[index];
      step.execute(this.data, function (err) {
        if (err) {
          var catchBlock = _this2.getCatch(index);
          if (!catchBlock || !_this2.executing) return callback(err);
          catchBlock.callback(err, _this2.data);
          var newIndex = catchBlock.index;
          _this2.executeFromStep(catchBlock.index, callback);
        } else {
          _this2.executeFromStep(++index, callback);
        }
      });
    }
  }, {
    key: 'stopExecution',
    value: function stopExecution() {
      if (!this.executing) throw new Error("stopExecution() called before execute()");
      this.executing = false;
    }
  }, {
    key: 'callForAllIntegrations',
    value: function callForAllIntegrations(method, cb) {
      async.parallel(this.integrations.map(function (integration) {
        return function (asyncCallback) {
          integration[method](asyncCallback);
        };
      }), cb);
    }
  }, {
    key: 'initializeIntegrations',
    value: function initializeIntegrations(cb) {
      if (this.initialized) return cb();
      this.callForAllIntegrations('initialize', cb);
    }
  }, {
    key: 'destroyIntegrations',
    value: function destroyIntegrations(cb) {
      this.callForAllIntegrations('destroy', cb);
    }
  }, {
    key: 'handler',
    value: function handler(event, context, callback) {
      // TODO: bind params from event.query, event.queryStringParameters, etc.
      this.execute(callback);
    }
  }, {
    key: 'fail',
    value: function fail(message) {
      this.stopExecution();
      throw new Error(message);
    }
  }, {
    key: 'succeed',
    value: function succeed(message) {
      this.stopExecution();
      logger.logSuccess(message);
    }
  }]);

  return Flow;
}();

module.exports = Flow;