let datafire = module.exports = {};
datafire.credentialsDirectory = process.cwd() + '/credentials';
datafire.integrationsDirectory = process.cwd() + '/integrations';

datafire.Integration = require('./lib/integration');
datafire.Flow = require('./lib/flow');

let args = require('yargs')
           .alias('i', 'integration')
           .alias('n', 'name')
           .alias('u', 'url')
           .alias('o', 'operation')
           .alias('a', 'all')
           .argv;

let cmd = args._[0];

if (cmd === 'integrate' || cmd === 'list' || cmd === 'describe') {
  require('./integrations')[cmd](args);
} else if (cmd === 'run') {
  let flow = require(process.cwd() + '/' + args.flow);
  if (args.options) {
    for (let key in args.options) {
      flow.options[key] = args.options[key];
    }
  }
  console.log('opts', flow.options);
  flow.execute((err) => {
    if (err) throw err;
  });
}
