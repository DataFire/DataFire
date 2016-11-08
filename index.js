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
           .alias('f', 'flow')
           .argv;

let cmd = args._[0];
let object = args._[1];
if (object) {
  args.name = args.name || object;
  args.integration = args.integration || object;
  args.flow = args.flow || object;
}

require('./commands/' + cmd)(args);

