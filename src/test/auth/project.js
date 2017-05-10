"use strict";
const datafire = require('../../entry');

const saas1integ = require('./saas1').integration;
const saas2integ = require('./saas2').integration;
const oauthinteg = require('./oauth').integration;

const authorizer = new datafire.Action({
  handler: (input, ctx) => {
    const users = {
      jack: {name: "Jack White", secret: "foobar", saas2: 'user1'},
      meg: {name: "Meg White", secret: "bazquux", saas2: 'user2'},
    }
    let user = users[ctx.request.headers.authorization];
    if (!user) return new datafire.Response({statusCode: 401});
    return user;
  }
})

module.exports = new datafire.Project({
  id: 'project',
  title: "SaaS #1",
  authorizers: {
    proj_user: {action: authorizer},
  },
  openapi: {
    host: 'localhost:3333',
    security: [{api_key: []}],
    securityDefinitions: {
      api_key: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      }
    },
  },
  paths: {
    '/me': {
      get: {
        operationId: 'me',
        action: new datafire.Action({
          handler: (input, ctx) => {
            return "You are logged in as " + ctx.accounts.proj_user.name;
          }
        })
      }
    },
    '/public': {
      get: {
        security: [],
        authorizers: {
          proj_user: null,
        },
        action: {},
      }
    },
    '/saas1/secret': {
      get: {
        action: new datafire.Action({
          handler: (input, ctx) => {
            ctx.accounts.saas1 = {api_key: 'user1'};
            return saas1integ.actions.secret.get(null, ctx);
          }
        })
      }
    },
    '/saas2/files': {
      get: {
        action: new datafire.Action({
          accounts: {
            saas2: saas2integ.securityDefinitions,
          },
          handler: (input, ctx) => {
            ctx.accounts.saas2 = {api_key: ctx.accounts.proj_user.saas2};
            return saas2integ.actions.files.get(null, ctx);
          }
        })
      }
    },
    '/oauth/invalid': {
      get: {
        action: new datafire.Action({
          accounts: {
            oauth: oauthinteg.securityDefinitions,
          },
          handler: (input, ctx) => {
            ctx.accounts.oauth = {
              access_token: 'expired',
              refresh_token: 'invalid',
            }
            return oauthinteg.actions.test.get(null, ctx);
          }
        })
      }
    },
    '/oauth/valid': {
      get: {
        action: new datafire.Action({
          accounts: {
            oauth: oauthinteg.securityDefinitions,
          },
          handler: (input, ctx) => {
            ctx.accounts.oauth = {
              access_token: 'expired',
              refresh_token: 'valid',
            }
            return oauthinteg.actions.test.get(null, ctx);
          }
        })
      }
    }
  }
})
