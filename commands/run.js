const path = require('path');

module.exports = function(args, callback) {
  let flow = require(path.join(process.cwd(), args.flow));
  if (args.params) {
    flow.setOptions(args.params);
  }
  flow.execute(callback);
}
