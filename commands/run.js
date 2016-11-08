module.exports = function(args) {
  let flow = require(process.cwd() + '/' + args.flow);
  if (args.options) {
    for (let key in args.options) {
      flow.options[key] = args.options[key];
    }
  }
  flow.execute((err) => {
    if (err) throw err;
  });
}
