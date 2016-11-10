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
    flow.step('insert',
              mongo.insert(),
              {collection: 'Foo', document: {foo: 'bar'}});
    flow.step('result',
              data => {
                expect(data.insert.ok).to.equal(1);
                expect(data.insert.n).to.equal(1);
                done();
              })
    flow.execute();
  })
})
