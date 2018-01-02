"use strict";

const expect = require('chai').expect;
const datafire = require('../entry');
const requestCB = require('request');
const request = function(opts) {
  return new Promise((resolve, reject) => {
    requestCB(opts, (err, resp, body) => {
      if (err) return reject(err);
      resolve({response: resp, body});
    })
  })
}

const integrationOpenAPI = {
  schemes: ['http'],
  host: 'localhost:3333',
  info: {version: '1'},
  securityDefinitions: {
    oauth: {
      type: 'oauth2',
      authorizationUrl: 'http://localhost:3333/authorize',
      tokenUrl: 'http://localhost:3333/token',
      flow: 'implicit',
    }
  },
  paths: {
    '/401': {
      get: {
        operationId: 'maybe401',
        responses: {
          '200': {description: 'OK'},
        }
      }
    }
  }
}
const integration = datafire.Integration.fromOpenAPI(integrationOpenAPI, 'test_integration');

let latestError = null;
let latestRefresh = null;
const VALID_ACCESS_TOKEN = 'abcde';

const project = new datafire.Project({
  accounts: {
    fluffy: {
      access_token: 'invalid',
      refresh_token: 'refresh',
      integration: 'test_integration',
    }
  },
  paths: {
    '/error': {
      get: {
        action: {
          handler: input => {throw new Error('testing')}
        }
      }
    },
    '/oauth_refresh': {
      get: {
        action: {
          handler: (input, context) => {
            context.accounts.test_integration = context.accounts.fluffy;
            return integration.actions.maybe401(input, context);
          }
        }
      }
    },
    '/401': {
      get: {
        action: {
          handler: (input, context) => {
            if (context.request.headers['authorization'] === 'Bearer ' + VALID_ACCESS_TOKEN) {
              return "OK";
            } else {
              return new datafire.Response({statusCode: 401});
            }
          }
        }
      }
    },
    '/token': {
      post: {
        action: {
          handler: input => {return {access_token: VALID_ACCESS_TOKEN}}
        }
      }
    }
  },
  events: {
    error: {
      action: {
        handler: input => latestError = input,
      }
    },
    oauth_refresh: {
      action: {
        handler: input => latestRefresh = input,
      }
    }
  }
});

describe("Event Handlers", () => {
  before(() => {
    return project.startServer(3333);
  })
  after(() => {
    return project.server.close();
  })

  it('should respect error handler', () => {
    return request({
      method: 'get',
      url: 'http://localhost:3333/error',
    })
    .then((result) => {
      expect(result.response.statusCode).to.equal(500);
      expect(latestError).to.not.equal(null);
      expect(latestError.error.message).to.equal('testing');
    })
  });

  it('should respect oauth_refresh handler', () => {
    return request({
      method: 'get',
      url: 'http://localhost:3333/oauth_refresh',
    })
    .then((result) => {
      expect(result.response.statusCode).to.equal(200);
      expect(latestRefresh).to.not.equal(null);
      expect(latestRefresh.alias).to.equal('fluffy');
      expect(latestRefresh.account.access_token).to.equal(VALID_ACCESS_TOKEN);
    })
  })
})
