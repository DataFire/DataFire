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
           .alias('v', 'verbose')
           .argv;

let cmd = args._[0];
let object = args._[1];
if (object) {
  args.name = args.name || object;
  args.integration = args.integration || object;
  args.flow = args.flow || object;
}

try {
  require('./commands/' + cmd)(args);
} catch (e) {
  logger.logError(e.toString());
  if (args.verbose) {
    throw e;
  } else {
    process.exit(1);
  }
}

