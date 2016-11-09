let expect = require('chai').expect;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';
datafire.credentialsDirectory = __dirname + '/credentials';

describe('MongoDB Integration', () => {
  it('should exist', () => {
    let i = new datafire.Integration('mongodb');
  })
})
