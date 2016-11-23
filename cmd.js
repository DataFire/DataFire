const logger = require('./lib/logger');
const datafire = require('./index');
const locations = require('./lib/locations');

const COMMANDS = [{
  name: 'list',
  description: "List integrations in the current project, or all available integrations if -a is used",
  examples: ["datafire list", "datafire list -a"],
  runner: require('./commands/list'),
  options: [{
    name: 'all',
    alias: 'a',
    description: "Show all available integrations",
  }, {
    name: 'query',
    alias: 'q',
    description: "Filter integrations by text",
  }]
}, {
  name: 'integrate [integrations..]',
  description: "Add an integration to the current project",
  examples: ["datafire integrate hacker_news"],
  runner: require('./commands/integrate'),
  options: [{
    name: 'openapi',
    description: "The URL of an Open API JSON specification",
  }, {
    name: 'rss',
    description: "The URL of an RSS feed",
  }, {
    name: 'name',
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
  }, {
    name: 'query',
    alias: 'q',
    description: "Filters for operations matching the query",
  }]
}, {
  name: 'authenticate <integration>',
  examples: ["datafire authenticate github"],
  description: "Store a set of credentials for a given integration",
  runner: require('./commands/authenticate'),
  options: [{
    name: 'as',
    description: 'The alias of the account to edit',
  }, {
    name: 'set_default',
    description: 'Set a default account for the given integration'
  }, {
    name: 'generate_token',
    description: "Generate a new OAuth 2.0 token",
  }, {
    name: 'client',
    description: "With generate_token, the account alias to use as the OAuth client",
  }]
}, {
  name: 'call <integration>',
  description: "Make a test call to an operation",
  examples: ["datafire call hacker_news -o getUser -p.username sama"],
  runner: require('./commands/call'),
  options: [{
    name: 'operation',
    alias: 'o',
    required: true,
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
  options: [{
    name: 'params',
    alias: 'p',
    description: "Pass parameters to the flow",
  }]
}]

let args = require('yargs')
           .option('v', {alias: 'verbose'})
           .global('v')
           .recommendCommands();

COMMANDS.forEach(cmd => {
  cmd.examples = cmd.examples || [];
  cmd.options = cmd.options || [];
  args = args.command(
        cmd.name,
        cmd.description,
        (yargs) => {
          cmd.options.forEach(o => {
            yargs.option(o.name, {alias: o.alias, describe: o.description, demand: o.required})
          })
        },
        (args) => {
          let handleError = e => {
            if (!e) return;
            logger.logError(e.toString());
            if (args.verbose) {
              logger.log(e.stack);
            } else {
              process.exit(1);
            }
          }
          if (cmd.name === 'authenticate') args.directory = locations.credentials[0];
          else args.directory = locations.integrations[0];
          try {
            cmd.runner(args, handleError);
          } catch (e) {
            handleError(e);
          }
        });
  cmd.examples.forEach(ex => {
    args = args.example(cmd.name, ex);
  });
})

args = args.help('h').alias('h', 'help').strict().argv;

