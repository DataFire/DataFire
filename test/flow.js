let expect = require('chai').expect

let logger = require('../lib/logger');
logger.silent = true;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';
datafire.credentialsDirectory = __dirname + '/credentials';

describe('Flows', () => {
  let flow = integration = null;

  let executeSuccess = (done) => {
    flow.execute(e => {
      expect(e).to.be.null;
      done();
    })
  }
  let executeFailure = (done) => {
    flow.execute(e => {
      expect(e).to.not.be.null;
      done();
    })
  }

  before(done => {
    require('./util/server').listen(3333, done);
  });

  beforeEach(() => {
    flow = new datafire.Flow('test', 'test_flow');
    integration = datafire.Integration.new('test');
  });

  it('should run', (done) => {
    flow.step('succeed', integration.get('/succeed'));
    flow.step('result',
              (data) => {
                expect(data.succeed).to.not.be.null;
                expect(data.succeed).to.equal('OK');
              })
    executeSuccess(done);
  });

  it('should should allow call by operationId', (done) => {
    flow.step('succeed', integration.getSucceed());
    flow.step('result',
              (data) => {
                expect(data.succeed).to.not.be.null;
                expect(data.succeed).to.equal('OK');
              })
    executeSuccess(done);
  });

  it('should not use auth by default', (done) => {
    flow.step('fail', integration.get('/secret'))
    flow.catch((err, data) => {
          expect(err.statusCode).to.equal(401);
          data.error = true;
        })
    flow.step('result',
        (data) => {
          expect(data.error).to.equal(true);
        })
    executeSuccess(done);
  });

  it('should throw error for non existant user', () => {
    expect(() => {
      integration.as('someone');
    }).to.throw();
  });

  it('should not throw error for existing user', () => {
    expect(() => {
      integration.as('user1');
    }).to.not.throw();
  });

  it('should fail for bad user', (done) => {
    integration.as('nonuser');
    flow.step('fail', integration.get('/secret'));
    flow.catch((err, data) => {
      expect(err.statusCode).to.equal(401);
      data.error = true;
    });
    flow.step('result',
        (data) => {
          expect(data.error).to.equal(true);
        })
    executeSuccess(done);
  });

  it('should succeed for good user', (done) => {
    integration.as('user1');
    flow.step('success', integration.get('/secret'));
    flow.catch((err, data) => {
      throw err;
    });
    flow.step('result',
        (data) => {
          expect(data.success).to.equal("OK");
        })
    executeSuccess(done);
  });

  it('should succeed with basic auth', done => {
    integration.as('user1_basic');
    flow.step('success', integration.get('/secret'));
    flow.catch((err, data) => {
      throw err;
    });
    flow.step('result',
        (data) => {
          expect(data.success).to.equal("OK");
        })
    executeSuccess(done);
  });

  it('should catch errors appropriately', done => {
    flow.step('success', integration.get('/succeed'))
        .catch(err => {throw err})
        .step('fail', integration.get('/secret'))
        .catch(err => {
          expect(err.statusCode).to.equal(401);
          flow.data.err1 = true;
        })
        .step('success', integration.get('/succeed'))
        .catch(err => {throw err})
        .step('success', integration.get('/succeed'))
        .catch(err => {throw err})
        .step('fail', integration.get('/secret'))
        .catch(err => {
          expect(err.statusCode).to.equal(401);
          flow.data.err2 = true;
        })
        .step('local_fail',
              (data) => {
                throw new Error("local");
              })
        .catch(err => {
          expect(err.message).to.equal('local');
          flow.data.err3 = err.message;
        })
        .step('result',
              (data) => {
                expect(data.err1).to.equal(true);
                expect(data.err2).to.equal(true);
                expect(data.err3).to.equal('local');
              })
    executeSuccess(done);
  });

  it('should throw uncaught errors', done => {
    flow.step('fail', integration.get('/secret'));
    executeFailure(done);
  });

  it('should not throw caught errors', done => {
    flow.step('fail', integration.get('/secret')).catch(e => {});
    executeSuccess(done);
  });

  it('should exit early on flow.succeed()', done => {
    flow.step('exit_early',
              (data) => {
                flow.succeed()
              })
        .step('shouldnt_reach_this',
              (data) => {
                throw new Error("didnt exit early")
              })
    executeSuccess(done);
  });

  it('should exit early on flow.fail()', done => {
    flow.step('exit_early',
              (data) => {
                flow.fail("exit early")
              })
        .step('shouldnt_reach_this',
              (data) => {
                throw new Error("didnt exit early")
              })
    flow.execute(e => {
      expect(e).to.not.be.undefined;
      expect(e.message).to.equal("exit early");
      done();
    })
  });

  it('should fail on flow.fail()', done => {
    flow.step('fail',
              (data) => {
                flow.fail();
              })
    executeFailure(done);
  });

  it('should not allow catching flow.fail()', done => {
    flow.step('fail',
              (data) => {
                flow.fail();
              })
        .catch(e => {})
    executeFailure(done);
  });
});

