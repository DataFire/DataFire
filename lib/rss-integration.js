const RESTIntegration = require('./rest-integration');
const Operation = require('./operation');
const rssParser = require('rss-parser');

class RSSOperation extends RESTIntegration.RESTOperation {
  call(args, cb) {
    super.call(args, (err, xml) => {
      rssParser.parseString(xml, cb);
    })
  }
}

class RSSIntegration extends RESTIntegration {
  makeOperation(name, opSpec) {
    return new RSSOperation(opSpec, this);
  }
}

module.exports = RSSIntegration;
