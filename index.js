let datafire = module.exports = {};
datafire.credentialsDirectory = process.cwd() + '/credentials';
datafire.integrationsDirectory = process.cwd() + '/integrations';

datafire.commands = require('./commands');
datafire.Integration = require('./lib/integration');
datafire.Operation = require('./lib/operation');
datafire.Flow = require('./lib/flow');

