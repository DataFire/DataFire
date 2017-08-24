"use strict";

const express = require('express');
const request = require('request');
const expect = require('chai').expect;
const datafire = require('../entry');
const swaggerMiddleware = require('swagger-express-middleware');

const OPENAPI = {
  swagger: '2.0',
  host: 'localhost:3333',
  schemes: ['http'],
  info: {
    version: '1.0',
  },
  paths: {
    '/pets': {
      get: {
        parameters: [{
          name: 'ids',
          in: 'query',
          type: 'array',
          items: {type: 'string'},
          collectionFormat: 'pipes',
        }],
        responses: {
          '200': {
            description: 'ok',
          }
        }
      }
    }
  }
}

let server = null;
let integration = null;

describe('Open API', () => {
  before((done) => {
    let router = express.Router();
    let middleware = new swaggerMiddleware.Middleware(router);
    middleware.init(OPENAPI, err => {
      if (err) return done(err);
      router.use(middleware.metadata());
      router.use(middleware.parseRequest(router, {json: {strict: false}}), middleware.validateRequest());
      router.use((req, res) => {
        res.json({
          body: req.body,
          query: req.query,
        })
      })
      let app = express();
      app.use(router);
      integration = datafire.Integration.fromOpenAPI(OPENAPI, 'petstore');
      server = app.listen(3333, done)
    });
  })

  after(() => server.close())

  it('should respond', done => {
    request.get('http://localhost:3333/pets', {json: true}, (err, resp, body) => {
      if (err) return done(err);
      expect(resp.statusCode).to.equal(200);
      expect(body.body).to.equal(undefined);
      expect(body.query).to.deep.equal({});
      done();
    })
  });

  it('should return pet IDs', done => {
    request.get('http://localhost:3333/pets?ids=foo|bar', {json: true}, (err, resp, body) => {
      if (err) return done(err);
      expect(resp.statusCode).to.equal(200);
      expect(body.body).to.equal(undefined);
      expect(body.query).to.deep.equal({ids: ['foo', 'bar']});
      done();
    })
  });

  it('should create integration', () => {
    expect(integration.allActions.length).to.equal(1);
    expect(integration.actions.pets.get.action instanceof datafire.Action).to.equal(true);
  });

  it('should accept array input', () => {
    return integration.actions.pets.get({ids: ['foo', 'bar']})
      .then(resp => {
        expect(resp.query).to.deep.equal({ids: ['foo', 'bar']});
      })
  })
})
