let logger = require('./lib/logger');

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
           .alias('p', 'params')
           .argv;

let cmd = args._[0];
if (args._[1]) {
  args.name = args.name || args._[1];
  args.integration = args.integration || args._[1];
}

if (cmd === 'integrate' || cmd === 'list' || cmd === 'describe') {
  require('./manage_integrations')[cmd](args);
} else if (cmd === 'run') {
  let flow = require(process.cwd() + '/' + args.flow);
  if (args.options) {
    for (let key in args.options) {
      flow.options[key] = args.options[key];
    }
  }
  flow.execute((err) => {
    if (err) throw err;
  });
} else if (cmd === 'call') {
  let integration = new datafire.Integration(args.integration);
  let op = integration.resolveOperation(args.operation);
  op.request(args.params || {}, (err, data) => {
    if (err) throw err;
    logger.log();
    logger.logJSON(data);
    logger.log();
  });
}
