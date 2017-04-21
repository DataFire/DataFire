let expect = require('chai').expect;
let datafire = require('datafire');
let http = require('../../integrations/http');

let target = new datafire.Project({
  paths: {
    '/foo': {
      get: {
        action: {
          handler: i => 'foo',
        }
      }
    }
  }
});

describe('HTTP integration', () => {
  let server = null;
  before(() => {
    return target.serve(3333)
      .then(df => server = df.server);
  })
  after(() => {
    server.close();
  })
  it('should make a request', () => {
    return http.actions.get.run({url: 'http://localhost:3333/foo', method: 'get'})
        .then(body => {
          expect(body.body).to.equal('"foo"');
          expect(body.statusCode).to.equal(200);
        });
  })
})
