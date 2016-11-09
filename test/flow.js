let expect = require('chai').expect

let logger = require('../lib/logger');
logger.silent = true;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';

describe('Flows', () => {
  let flow = integration = null;

  before(done => {
    require('./util/server').listen(3333, done);
  });

  beforeEach(() => {
    flow = new datafire.Flow('test', 'test_flow');
    integration = new datafire.Integration('test');
  })

  it('should run', (done) => {
    flow.step('succeed', integration.get('/succeed'));
    flow.step('result',
              (data) => {
                expect(data.succeed).to.not.be.null;
                expect(data.succeed).to.equal('OK');
                done();
              })
    flow.execute();
  })

  it('should not use auth by default', (done) => {
    flow.step('fail', integration.get('/secret'))
    flow.catch((err, data) => {
          expect(err.statusCode).to.equal(401);
          data.error = true;
        })
    flow.step('result',
        (data) => {
          expect(data.error).to.equal(true);
          done();
        })
    flow.execute();
  })
})

