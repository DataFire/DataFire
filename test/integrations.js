let expect = require('chai').expect;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';
datafire.credentialsDirectory = __dirname + '/credentials';

describe('MongoDB Integration', () => {
  it('should exist', (done) => {
    let mongo = datafire.Integration.new('mongodb');
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
