let datafire = module.exports = {};
datafire.credentialsDirectory = process.cwd() + '/credentials';
datafire.integrationsDirectory = process.cwd() + '/integrations';

let args = require('yargs')
           .command('integrate')
           .argv;

let cmd = args._[0];

if (cmd === 'integrate') {
  require('./integrate')(args._[1]);
}

