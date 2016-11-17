'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RESTIntegration = require('./rest-integration');
var Operation = require('./operation');
var rssParser = require('rss-parser');

var RSSOperation = function (_RESTIntegration$REST) {
  _inherits(RSSOperation, _RESTIntegration$REST);

  function RSSOperation() {
    _classCallCheck(this, RSSOperation);

    return _possibleConstructorReturn(this, (RSSOperation.__proto__ || Object.getPrototypeOf(RSSOperation)).apply(this, arguments));
  }

  _createClass(RSSOperation, [{
    key: 'call',
    value: function call(args, cb) {
      _get(RSSOperation.prototype.__proto__ || Object.getPrototypeOf(RSSOperation.prototype), 'call', this).call(this, args, function (err, xml) {
        rssParser.parseString(xml, cb);
      });
    }
  }]);

  return RSSOperation;
}(RESTIntegration.RESTOperation);

var RSSIntegration = function (_RESTIntegration) {
  _inherits(RSSIntegration, _RESTIntegration);

  function RSSIntegration() {
    _classCallCheck(this, RSSIntegration);

    return _possibleConstructorReturn(this, (RSSIntegration.__proto__ || Object.getPrototypeOf(RSSIntegration)).apply(this, arguments));
  }

  _createClass(RSSIntegration, [{
    key: 'makeOperation',
    value: function makeOperation(name, opSpec) {
      return new RSSOperation(opSpec, this);
    }
  }]);

  return RSSIntegration;
}(RESTIntegration);

module.exports = RSSIntegration;