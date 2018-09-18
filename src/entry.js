var version = require('./util/node-version.js');
if (version > 6) {
  module.exports = require('./index');
} else {
  module.exports = require('../distribution/src/index');
}
