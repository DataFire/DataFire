"use strict";
let datafire = require('../../entry');

const authorizer = new datafire.Action({
  handler: (input, context) => {
    const users = {
      user1: {name: "Number One", files: ["foo.txt", "bar.md"]},
      user2: {name: "Number Two", files: []},
    }
    let user = users[context.request.headers.authorization];
    if (!user) return new datafire.Response({statusCode: 401});
    return user;
  }
})

module.exports = new datafire.Project({
  id: 'saas2',
  title: "SaaS #2",
  openapi: {
    host: 'localhost:3335',
    securityDefinitions: {
      api_key: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
      }
    }
  },
  authorizers: {
    user: {action: authorizer},
  },
  paths: {
    '/me': {
      get: {
        action: new datafire.Action({
          handler: (input, ctx) => {
            return "You're logged in as " + ctx.accounts.user.name;
          }
        })
      }
    },
    '/files': {
      get: {
        action: new datafire.Action({
          handler: (input, ctx) => ctx.accounts.user.files,
        })
      }
    }
  }
})
