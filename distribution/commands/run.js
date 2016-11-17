'use strict';

var path = require('path');

module.exports = function (args, callback) {
  var flow = require(path.join(process.cwd(), args.flow));
  if (args.params) {
    flow.setOptions(args.params);
  }
  flow.execute(callback);
};