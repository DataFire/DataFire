let logger = require('./lib/logger');

let datafire = module.exports = {};
datafire.credentialsDirectory = process.cwd() + '/credentials';
datafire.integrationsDirectory = process.cwd() + '/integrations';

datafire.Integration = require('./lib/integration');
datafire.Operation = require('./lib/operation');
datafire.Flow = require('./lib/flow');

let COMMANDS = [{
  name: 'list',
  description: "List integrations in the current project, or all available integrations if -a is used",
  examples: ["datafire list", "datafire list -a"],
  runner: require('./commands/list'),
  options: [{
    name: 'all',
    alias: 'a',
    description: "Show all available integrations",
  }]
}, {
  name: 'integrate <integration>',
  description: "Add an integration to the current project",
  examples: ["datafire integrate hacker_news"],
  runner: require('./commands/integrate'),
  options: [{
    name: 'url',
    alias: 'u',
    description: "The URL of an Open API JSON specification",
  }, {
    name: 'as',
    description: "An alias to use for the integration in this project",
  }]
}, {
  name: 'describe <integration>',
  description: "Show details for an integration or operation",
  examples: [
    "datafire describe hacker_news",
    "datafire describe hacker_news -o getUser",
  ],
  runner: require('./commands/describe'),
  options: [{
    name: 'operation',
    alias: 'o',
    description: "The operation to describe",
  }]
}, {
  name: 'authenticate <integration>',
  examples: ["datafire authenticate github"],
  description: "Store a set of credentials for a given integration",
  runner: require('./commands/authenticate'),
}, {
  name: 'call <integration>',
  description: "Make a test call to an operation",
  examples: ["datafire call hacker_news -o getUser -p.username sama"],
  runner: require('./commands/call'),
  options: [{
    name: 'operation',
    alias: 'o',
    description: "The operation to call",
  }, {
    name: 'as',
    description: "The account alias to use",
  }, {
    name: 'params',
    alias: 'p',
    description: "Pass parameters to the operation",
  }]
}, {
  name: 'run <flow>',
  examples: ["datafire run ./flow.js"],
  description: "Run a flow locally",
  runner: require('./commands/run'),
}]

let args = require('yargs')
           .option('v', {alias: 'verbose'})
           .global('v')
           .recommendCommands();

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
              logger.log(e.stack);
            } else {
              process.exit(1);
            }
          }
        });
  (cmd.examples || []).forEach(ex => {
    args = args.example(cmd.name, ex);
  })
})

args = args.help('h').alias('h', 'help').argv;
