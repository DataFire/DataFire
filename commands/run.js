const path = require('path');
const logger = require('../lib/logger');

module.exports = function(args, callback) {
  let flow = require(path.join(process.cwd(), args.flow));
  if (args.params) {
    flow.setOptions(args.params);
  }
  flow.execute((err, result) => {
    if (err) return callback(err);
    logger.logJSON(result);
  });
}
