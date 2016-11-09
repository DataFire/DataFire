let logger = require('./lib/logger');

let datafire = module.exports = {};
datafire.credentialsDirectory = process.cwd() + '/credentials';
datafire.integrationsDirectory = process.cwd() + '/integrations';

datafire.Integration = require('./lib/integration');
datafire.Flow = require('./lib/flow');

let COMMANDS = [{
  name: 'list',
  description: "List integrations",
  runner: require('./commands/list'),
  options: [{
    name: 'all',
    alias: 'a',
    description: "Show all available integrations",
  }]
}, {
  name: 'integrate [integration]',
  description: "Add an integration to the current project",
  runner: require('./commands/integrate'),
  options: [{
    name: 'url',
    alias: 'u',
    description: "The URL of an Open API JSON specification",
  }]
}, {
  name: 'authenticate [integration]',
  runner: require('./commands/authenticate'),
}, {
  name: 'run [flow]',
  runner: require('./commands/run'),
}, {
  name: 'call [integration]',
  runner: require('./commands/call'),
}, {
  name: 'describe [integration]',
  runner: require('./commands/describe'),
}]


let args = require('yargs');

COMMANDS.forEach(cmd => {
  args = args.command(
        cmd.name,
        cmd.description,
        (yargs) => {
          cmd.options.forEach(o => {
            yargs.option(o.name, {alias: o.alias, describe: o.description})
          })
        },
        (args) => {
          let object = args._[1];
          try {
            cmd.runner(args);
          } catch (e) {
            logger.logError(e.toString());
            if (args.verbose) {
              throw e;
            } else {
              process.exit(1);
            }
          }
        });
})

args = args.help('h').alias('h', 'help').argv;
