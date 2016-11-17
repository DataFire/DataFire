'use strict';

var datafire = require('../index');
var logger = require('../lib/logger');

module.exports = function (args, callback) {
  var integration = datafire.Integration.new(args.integration);
  if (args.as) integration.as(args.as);
  integration.initialize(function (err) {
    if (err) return callback(err);
    var opId = integration.resolveOperationId(args.operation);
    if (!opId) return callback(new Error("Couldn't find operation " + args.operation));
    var op = integration[opId]();
    op.call(args.params || {}, function (err, data) {
      if (err) return callback(err);
      logger.logJSON(data);
      logger.log();
    });
  });
};