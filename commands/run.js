module.exports = function(args) {
  let flow = require(process.cwd() + '/' + args.flow);
  if (args.params) {
    flow.setOptions(args.params);
  }
  flow.execute((err) => {
    if (err) throw err;
  });
}
