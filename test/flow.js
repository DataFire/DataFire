let expect = require('chai').expect

let logger = require('../lib/logger');
logger.silent = true;

let datafire = require('../index');
datafire.integrationsDirectory = __dirname + '/integrations';

describe('Flows', () => {
  it('should run', (done) => {
    let flow = new datafire.Flow('test', 'test_flow');
    let hn = new datafire.Integration('hacker_news');
    flow.step('user',
              hn.getUser(),
              {username: 'sama'})
    flow.step('result',
              (data) => {
                expect(data.user).to.not.be.null;
                expect(data.user.id).to.equal('sama');
                done();
              })
    flow.execute();
  })
})

