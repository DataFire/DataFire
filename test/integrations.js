let expect = require('chai').expect;
let mongomock = require('mongo-mock');

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';
datafire.credentialsDirectory = __dirname + '/credentials';

let MongoDBIntegration = require('../native_integrations/mongodb');

describe('MongoDB Integration', () => {
  it('should exist', (done) => {
    let mongo = new MongoDBIntegration(mongomock.MongoClient).as('test');
    let flow = new datafire.Flow('test_flow');
    flow.step('mongo_get',
              mongo.get({foo: 'bar'}));
    flow.step('result',
              data => {
                expect(data.mongo_get).to.equal('baz');
                done();
              })
    flow.execute();
  })
})
