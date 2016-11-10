let expect = require('chai').expect;
let mongomock = require('mongo-mock');
mongomock.max_delay = 0;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';
datafire.credentialsDirectory = __dirname + '/credentials';

let MongoDBIntegration = require('../native_integrations/mongodb');

describe('MongoDB Integration', () => {
  it('should work', (done) => {
    let mongo = new MongoDBIntegration(mongomock.MongoClient).as('test');
    let flow = new datafire.Flow('test_flow');

    let pets = [{
      name: 'Lucy',
      type: 'dog',
    }, {
      name: 'Blaney',
      type: 'dog',
    }, {
      name: 'Grumpy',
      type: 'cat',
    }]

    flow.step('insert', mongo.insert('Pet'), {documents: pets})
        .step('insert_result',
              data => {
                expect(data.insert.ok).to.equal(1);
                expect(data.insert.n).to.equal(pets.length);
              });
    flow.step('find', mongo.find('Pet'), {query: {type: 'dog'}})
        .step('find_result',
              data => {
                expect(data.find.length).to.equal(2);
                expect(data.find[0].name).to.equal('Lucy');
                expect(data.find[1].name).to.equal('Blaney');
              });
    flow.step('findOne', mongo.findOne('Pet'), {query: {name: "Grumpy"}})
    flow.step('findOne_result',
              data => {
                expect(data.findOne.name).to.equal('Grumpy');
                expect(data.findOne.type).to.equal('cat');
              })
    flow.execute(err => {
      if (err) throw err;
      done();
    });
  })
})
