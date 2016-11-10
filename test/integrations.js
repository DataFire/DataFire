let expect = require('chai').expect;
let mongomock = require('mongo-mock');
mongomock.max_delay = 0;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';
datafire.credentialsDirectory = __dirname + '/credentials';

let MongoDBIntegration = require('../native_integrations/mongodb');

describe('MongoDB Integration', () => {
  it('should exist', (done) => {
    let mongo = new MongoDBIntegration(mongomock.MongoClient).as('test');
    let flow = new datafire.Flow('test_flow');
    flow.step('insert',
              mongo.insert('Foo'),
              {document: {foo: 'bar'}});
    flow.step('insert_result',
              data => {
                expect(data.insert.ok).to.equal(1);
                expect(data.insert.n).to.equal(1);
              });
    flow.step('find',
              mongo.find('Foo'),
              {query: {foo: 'bar'}})
    flow.step('find_result',
              data => {
                expect(data.find.length).to.equal(1);
                expect(data.find[0].foo).to.equal('bar');
              })
    flow.step('findOne',
              mongo.findOne('Foo'))
    flow.step('findOne_result',
              data => {
                expect(data.findOne.foo).to.equal('bar');
              })
    flow.execute(err => {
      expect(err).to.be.null;
      done();
    });
  })
})
