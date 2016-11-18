'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Operation = require('./operation');
var Integration = require('./integration.js');
var SwaggerClient = require('./swagger-client');

var METHODS = ['get', 'put', 'post', 'patch', 'delete', 'options', 'head'];

var getID = function getID(op) {
  return op.operationId || op.method.toUpperCase() + ' ' + op.path;
};

var RESTOperation = function (_Operation) {
  _inherits(RESTOperation, _Operation);

  function RESTOperation(info, integration) {
    _classCallCheck(this, RESTOperation);

    return _possibleConstructorReturn(this, (RESTOperation.__proto__ || Object.getPrototypeOf(RESTOperation)).call(this, getID(info), integration));
  }

  _createClass(RESTOperation, [{
    key: 'call',
    value: function call(args, cb, isRetry) {
      var _this2 = this;

      this.integration.client.request(this.info.method, this.info.path, args, function (err, resp) {
        if (err) {
          if (!isRetry && err.statusCode === 401 && _this2.integration.account && _this2.integration.account.refresh_token) {
            _this2.integration.client.refreshOAuth(function (err, tok) {
              if (err) return cb(err);
              _this2.integration.saveCredentials(_this2.integration.client.auth, function (err) {
                // ignore err - fails on AWS Lambda
                _this2.call(args, cb, true);
              });
            });
          } else {
            return cb(err);
          }
        } else {
          cb(null, resp);
        }
      });
    }
  }]);

  return RESTOperation;
}(Operation);

var RESTIntegration = function (_Integration) {
  _inherits(RESTIntegration, _Integration);

  function RESTIntegration(name, spec) {
    _classCallCheck(this, RESTIntegration);

    spec.operations = {};
    for (var path in spec.paths) {
      for (var method in spec.paths[path]) {
        if (method === 'parameters') continue;
        var op = spec.paths[path][method];
        op.method = method;
        op.path = path;
        var bestCode = null;
        for (var code in op.responses) {
          if (code.startsWith('2') && (!bestCode || code < bestCode)) {
            bestCode = code;
          }
        }
        if (!bestCode) {
          op.response = { description: 'OK' };
        } else {
          op.response = op.responses[bestCode];
        }
        spec.operations[getID(op)] = op;
      }
    }

    var _this3 = _possibleConstructorReturn(this, (RESTIntegration.__proto__ || Object.getPrototypeOf(RESTIntegration)).call(this, name, spec));

    METHODS.forEach(function (m) {
      _this3[m] = function (path) {
        if (!_this3.spec.paths[path]) throw new Error("Path " + path + " not found in " + _this3.name);
        if (!_this3.spec.paths[path][m]) throw new Error("Method " + m + " not found for path " + path + " in " + _this3.name);
        var op = _this3.spec.paths[path][m];
        return _this3.makeOperation(getID(op), op);
      };
    });
    _this3.client = new SwaggerClient({ swagger: spec });
    return _this3;
  }

  _createClass(RESTIntegration, [{
    key: 'initialize',
    value: function initialize(cb) {
      var _this4 = this;

      this.client.initialize(function (err) {
        _this4.spec = _this4.client.swagger;
        _this4.client.authorize(_this4.account);
        cb(err);
      });
    }
  }, {
    key: 'makeOperation',
    value: function makeOperation(name, opSpec) {
      return new RESTOperation(opSpec, this);
    }
  }, {
    key: 'resolveOperationId',
    value: function resolveOperationId(str) {
      for (var opId in this.spec.operations) {
        var op = this.spec.operations[opId];
        var fakeOpId = new RegExp('^\s*' + op.method + '\\s+' + op.path + '\s*$', 'i');
        if (str === op.operationId || str.match(fakeOpId)) {
          return opId;
        }
      }
      throw new Error("Couldn't resolve operation " + str);
    }
  }]);

  return RESTIntegration;
}(Integration);

RESTIntegration.RESTOperation = RESTOperation;
module.exports = RESTIntegration;