let datafire = module.exports = {};
datafire.credentialsDirectory = process.cwd() + '/credentials';
datafire.integrationsDirectory = process.cwd() + '/integrations';

datafire.Integration = require('./lib/integration');
datafire.Flow = require('./lib/flow');

let args = require('yargs')
           .command('integrate')
           .alias('i', 'integration')
           .alias('n', 'name')
           .alias('u', 'url')
           .alias('o', 'operation')
           .alias('a', 'all')
           .argv;

let cmd = args._[0];

if (cmd === 'integrate' || cmd === 'list' || cmd === 'describe') {
  require('./integrations')[cmd](args);
}

