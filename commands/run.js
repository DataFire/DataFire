module.exports = function(args) {
  let flow = require(process.cwd() + '/' + args.flow);
  if (args.options) {
    flow.setOptions(args.options);
  }
  flow.execute((err) => {
    if (err) throw err;
  });
}
