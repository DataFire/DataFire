'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var datafire = require('../index');
var fs = require('fs');
var path = require('path');

var NATIVE_DIR = path.join(__dirname, '..', 'native_integrations');

var Integration = function () {
  function Integration(name, spec) {
    var _this = this;

    _classCallCheck(this, Integration);

    this.name = name;
    this.spec = spec;

    var _loop = function _loop(opId) {
      var op = _this.spec.operations[opId];
      if (_this[opId] === undefined) {
        _this[opId] = function () {
          return _this.makeOperation(opId, op);
        };
      }
    };

    for (var opId in this.spec.operations) {
      _loop(opId);
    }
  }

  _createClass(Integration, [{
    key: 'initialize',
    value: function initialize(cb) {
      cb();
    }
  }, {
    key: 'destroy',
    value: function destroy(cb) {
      cb();
    }
  }, {
    key: 'getAccounts',
    value: function getAccounts() {
      var accounts = {};
      try {
        accounts = require(path.join(datafire.credentialsDirectory, this.name));
        if (!Object.keys(accounts).length) throw new Error();
      } catch (e) {
        throw new Error("Credentials not found for " + this.name + ". Please run:\ndatafire authenticate " + this.name);
      }
      return accounts;
    }
  }, {
    key: 'as',
    value: function as(account) {
      var accounts = this.getAccounts();
      if (account === 'default') {
        account = accounts[account] || Object.keys(accounts)[0];
      }
      if (!accounts[account]) throw new Error("Account " + account + " not found for " + this.name);
      this.accountName = account;
      this.account = accounts[account];
      return this;
    }
  }, {
    key: 'saveCredentials',
    value: function saveCredentials(newCreds) {
      this.account = newCreds;
      var accounts = this.getAccounts();
      accounts[this.accountName] = newCreds;
      fs.writeFileSync(path.join(datafire.credentialsDirectory, this.name + '.json'), JSON.stringify(accounts, null, 2));
    }
  }, {
    key: 'getOperationDetails',
    value: function getOperationDetails(str) {
      var id = this.resolveOperationId(str);
      if (!this.spec.operations[id]) throw new Error("Operation " + str + " not found in " + this.name);
      return this.spec.operations[id];
    }
  }, {
    key: 'resolveOperationId',
    value: function resolveOperationId(str) {
      return str;
    }
  }, {
    key: 'makeOperation',
    value: function makeOperation(name, opSpec) {
      throw new Error("makeOperation not implemented");
    }
  }], [{
    key: 'new',
    value: function _new(name) {
      var RESTIntegration = require('./rest-integration');
      var RSSIntegration = require('./rss-integration');
      var MongoDBIntegration = require('../native_integrations/mongodb');
      if (name === 'mongodb') {
        return new MongoDBIntegration();
      }
      var tryOpen = function tryOpen(dir) {
        var filename = path.join(dir, name + '.openapi.json');
        var spec = null;
        try {
          spec = require(filename);
        } catch (e) {
          filename = path.join(dir, name + '.rss.json');
          try {
            spec = require(filename);
          } catch (e) {};
        }
        if (!spec) return;
        if (filename.endsWith('.openapi.json')) {
          return new RESTIntegration(name, spec);
        } else {
          return new RSSIntegration(name, spec);
        }
      };
      var integration = tryOpen(datafire.integrationsDirectory) || tryOpen(NATIVE_DIR);
      if (!integration) throw new Error("Integration " + name + " not found. Please run:\ndatafire integrate " + name);
      return integration;
    }
  }]);

  return Integration;
}();

module.exports = Integration;