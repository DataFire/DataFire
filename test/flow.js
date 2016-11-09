let expect = require('chai').expect

let logger = require('../lib/logger');
logger.silent = true;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';

describe('Flows', () => {
  before(done => {
    require('./util/server').listen(3333, done);
  })

  it('should run', (done) => {
    let flow = new datafire.Flow('test', 'test_flow');
    let integ = new datafire.Integration('test');
    flow.step('succeed', integ.get('/succeed'));
    flow.step('result',
              (data) => {
                expect(data.succeed).to.not.be.null;
                expect(data.succeed).to.equal('OK');
                done();
              })
    flow.execute();
  })
})

