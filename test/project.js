"use strict";

const fs = require('fs');
const expect = require('chai').expect;
const request = require('request');
const swaggerParser = require('swagger-parser');
const lib = require('../lib');

const ping = new lib.Action({
  handler: _ => Promise.resolve('pong'),
})

const hello = new lib.Action({
  handler: input => Promise.resolve('Hello, ' + input.name),
})

const respond = new lib.Action({
  handler: input => {
    return Promise.resolve(new lib.Response({
      statusCode: input.statusCode,
      body: JSON.stringify(input.message),
      headers: {'Content-Type': 'application/json'},
    }));
  }
})

const player = new lib.Action({
  inputSchema: {
    type: 'object',
    properties: {
      id: {type: 'integer'},
      name: {type: 'string'},
      aliases: {
        type: 'array',
        items: {type: 'string'},
      },
    }
  },
  handler: input => {
    return Promise.resolve(input);
  }
})
player.outputSchema = player.inputSchema;

const paths = {
    '/ping': {
      get: {
        action: ping,
      }
    },

    '/hello': {
      get: {
        action: hello,
        parameters: [{
          name: 'name',
          type: 'string',
          in: 'query',
          required: true,
          maxLength: 10,
        }],
      }
    },

    '/respond': {
      get: {
        action: respond,
        parameters: [{
          name: 'statusCode',
          in: 'query',
          type: 'integer',
        }, {
          name: 'message',
          in: 'query',
          type: 'string',
        }],
      }
    },

    '/player/{id}': {
      post: {
        action: player,
      }
    }
}

const BASE_URL = 'http://localhost:3333';

describe("Project", () => {
  let server = null;
  let project = null;
  before(done => {
    project = new lib.Project({
      paths,
      openapi: {host: 'localhost:3333'},
    });
    project.serve().then(df => {
      server = df.server;
      done();
    });
  });

  after(() => server.close());

  it('should serve ping', (done) => {
    request.get(BASE_URL + '/ping', {json: true}, (err, resp, body) => {
      if (err) throw err;
      expect(resp.statusCode).to.equal(200);
      expect(body).to.equal('pong');
      done();
    })
  });

  it('should serve hello with parameter', (done) => {
    request.get(BASE_URL + '/hello?name=world', {json: true}, (err, resp, body) => {
      if (err) throw err;
      expect(resp.statusCode).to.equal(200);
      expect(body).to.equal('Hello, world');
      done();
    })
  });

  it('should validate parameter', (done) => {
    request.get(BASE_URL + '/hello?name=reallylongname', {json: true}, (err, resp, body) => {
      if (err) throw err;
      expect(resp.statusCode).to.equal(400);
      expect(body.error).to.contain('query parameter is invalid')
      done();
    })
  });

  it('should allow custom response', (done) => {
    request.get(BASE_URL + '/respond?statusCode=418&message=I+am+a+teapot', {json: true}, (err, resp, body) => {
      expect(resp.statusCode).to.equal(418);
      expect(body).to.equal('I am a teapot');
      done();
    })
  });

  it('should combine parameters and body', (done) => {
    const obj = {
      name: 'Jordan',
      aliases: ['MJ', 'His Airness'],
    };
    request.post(BASE_URL + '/player/23', {json: true, body: obj}, (err, resp, body) => {
      expect(resp.statusCode).to.equal(200);
      obj.id = 23;
      expect(body).to.deep.equal(obj);
      done();
    })
  })

  it('should produce OpenAPI JSON', (done) => {
    swaggerParser.validate(project.openapi, (err, api) => {
      if (process.env.WRITE_GOLDEN) {
        fs.writeFileSync(__dirname + '/golden.openapi.json', JSON.stringify(api || project.openapi, null, 2));
        expect(err).to.equal(null);
      } else {
        expect(err).to.equal(null);
        expect(api).to.deep.equal(require('./golden.openapi.json'));
      }
      done();
    })
  })
})

