"use strict";
let datafire = require('../../entry');

const VALID_TOKEN = 'abcde';

const HOST = 'localhost:3336';
const HOST_FULL = 'http://' + HOST;

module.exports = new datafire.Project({
  id: 'oauth',
  openapi: {
    host: HOST,
    securityDefinitions: {
      oauth: {
        type: 'oauth2',
        scopes: {
          all: 'All access'
        },
        name: 'Authorization',
        authorizationUrl: HOST_FULL + '/auth',
        tokenUrl: HOST_FULL + '/token',
        flow: 'implicit',
      }
    },
    consumes: ['application/x-www-form-urlencoded'],
  },
  paths: {
    '/token': {
      post: {
        parameters: [{
          name: 'client_id',
          in: 'formData',
          type: 'string',
        }, {
          name: 'client_secret',
          in: 'formData',
          type: 'string',
        }, {
          name: 'refresh_token',
          in: 'formData',
          type: 'string',
        }, {
          name: 'grant_type',
          in: 'formData',
          type: 'string',
        }],
        action: new datafire.Action({
          handler: input => {
            if (input.refresh_token === 'valid') return {access_token: VALID_TOKEN};
            return {error: 'invalid_request'};
          }
        })
      }
    },
    '/test': {
      get: {
        action: new datafire.Action({
          handler: (input, ctx) => {
            let auth = ctx.request.headers.authorization;
            if (!auth) return new datafire.Response({statusCode: 401});
            let token = auth.split(' ')[1];
            if (token !== VALID_TOKEN) return new datafire.Response({statusCode: 401});
            return 'OK';
          }
        }),
      }
    }
  }
})
