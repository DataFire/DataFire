"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Operation = function () {
  function Operation(name, integration) {
    _classCallCheck(this, Operation);

    this.name = name;
    this.integration = integration;
    this.info = this.integration.getOperationDetails(name);
  }

  _createClass(Operation, [{
    key: "validateArgs",
    value: function validateArgs(args) {
      var _this = this;

      var _loop = function _loop(argName) {
        var param = (_this.info.parameters || []).filter(function (p) {
          return p.name === argName;
        })[0];
        if (!param) throw new Error("Unrecognized argument " + argName + " for operation " + _this.name + " in " + _this.integration.name);
      };

      for (var argName in args) {
        _loop(argName);
      }
    }
  }, {
    key: "call",
    value: function call(args, cb) {
      throw new Error("Call not implemented");
    }
  }]);

  return Operation;
}();

module.exports = Operation;