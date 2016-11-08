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
  require('./commands/integrate')[cmd](args);
} else if (cmd === 'run') {
  require('./commands/run')(args);
} else if (cmd === 'call') {
  require('./commands/call')(args);
} else if (cmd === 'authorize') {
  require('./commands/autorize')(args);
}
