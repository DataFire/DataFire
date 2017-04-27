"use strict";

let expect = require('chai').expect;
let mongomock = require('mongo-mock');
mongomock.max_delay = 0;

let datafire = require('../index');
let locations = require('../lib/locations');
locations.integrations.push(__dirname + '/integrations');
locations.credentials = [__dirname + '/credentials'];

let mongo = datafire.Integration.new('mongodb').as('test');
mongo.client = mongomock.MongoClient;

describe('MongoDB Integration', () => {
  let executeSuccess = (flow, done) => {
    flow.execute(err => {
      if (err) throw err;
      done();
    });
  }

  it('should insert', (done) => {
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

    flow.step('insert', {
      do: mongo.insert('Pet'),
      params: {documents: pets},
      finish: data => {
        expect(data.insert.ok).to.equal(1);
        expect(data.insert.n).to.equal(pets.length);
      }
    });
    executeSuccess(flow, done);
  })

  it('should find dogs', done => {
    let flow = new datafire.Flow('test_flow');
    flow.step('find', mongo.find('Pet'), {query: {type: 'dog'}})
        .step('find_result',
              data => {
                expect(data.find.length).to.equal(2);
                expect(data.find[0].name).to.equal('Lucy');
                expect(data.find[1].name).to.equal('Blaney');
              });
    executeSuccess(flow, done);
  });

  it('should find Grumpy', done => {
    let flow = new datafire.Flow('test_flow');
    flow.step('findOne', mongo.findOne('Pet'), {query: {name: "Grumpy"}})
    flow.step('findOne_result',
              data => {
                expect(data.findOne.name).to.equal('Grumpy');
                expect(data.findOne.type).to.equal('cat');
              })
    executeSuccess(flow, done);
  })

  it('should update Lucy', done => {
    let flow = new datafire.Flow('test_flow');
    flow.step('update', mongo.update('Pet'), {query: {name: "Lucy"}, update: {$set: {age: 2}}});
    flow.step('update_result',
              data => {
                expect(data.update.n).to.equal(1);
              });
    flow.step('lucy', mongo.findOne('Pet'), {query: {name: "Lucy"}});
    flow.step('find_result',
              data => {
                expect(data.lucy.name).to.equal("Lucy");
                expect(data.lucy.age).to.equal(2);
              })
    executeSuccess(flow, done);
  })

  it('should remove Grumpy', done => {
    let flow = new datafire.Flow('test_flow');
    flow.step('remove', mongo.remove('Pet'), {query: {name: "Grumpy"}})
    flow.step('remove_result',
              data => {
                expect(data.remove.n).to.equal(1);
              })
    flow.step('find_grumpy', mongo.find('Pet'), {query: {name: "Grumpy"}})
    flow.step('find_result',
              data => {
                expect(data.find_grumpy.length).to.equal(0);
              })
    executeSuccess(flow, done);
  })
})
