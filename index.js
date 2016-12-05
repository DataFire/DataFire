let datafire = module.exports = {};

datafire.commands = require('./commands');
datafire.RESTIntegration = require('./lib/rest-integration');
datafire.Integration = require('./lib/integration');
datafire.Operation = require('./lib/operation');
datafire.Flow = require('./lib/flow');

