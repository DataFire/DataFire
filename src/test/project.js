"use strict";

const fs = require('fs');
const expect = require('chai').expect;
const request = require('request');
const swaggerParser = require('swagger-parser');
const lib = require('../entry');

let lastError = null;
const storeError = new lib.Action({
  handler: input => {
    return lastError = input.error;
  },
});

let lastHttpEvent = null;
const storeHttpEvent = new lib.Action({
  handler: input => {
    return lastHttpEvent = input;
  }
})

const ping = new lib.Action({
  handler: _ => Promise.resolve('pong'),
});

const echoInputs = new lib.Action({
  handler: input => input,
});

const throwError = new lib.Action({
  inputs: [{title: 'message', type: 'string'}],
  handler: input => {
    throw new Error(input.message);
  }
});

const respondWithStatus = new lib.Action({
  inputs: [{title: 'statusCode', type: 'integer'}],
  handler: input => {
    return new lib.Response({statusCode: input.statusCode});
  }
})

const hello = new lib.Action({
  inputs: [{
    title: 'name',
    type: 'string',
    maxLength: 20,
  }, {
    title: 'uppercase',
    type: 'boolean',
    default: false,
  }],
  handler: (input, context) => {
    let message = 'Hello, ' + input.name;
    if (input.uppercase) message = message.toUpperCase();
    return message;
  },
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

    '/statusCode': {
      get: {
        action: respondWithStatus,
      }
    },

    '/throw': {
      get: {
        action: throwError,
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
        }, {
          name: 'uppercase',
          type: 'boolean',
          in: 'query',
        }],
      }
    },

    '/hello_world': {
      get: {
        action: hello,
        input: {
          name: 'world',
        }
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
        parameters: [{
          in: 'query',
          name: 'insert',
          type: 'boolean',
        }]
      }
    },

    '/files': {
      get: {
        extendPath: 1,
        action: echoInputs,
      }
    },

    '/directory/{filename}': {
      get: {
        extendPath: 1,
        action: echoInputs,
      }
    },
}

const BASE_URL = 'http://localhost:3333';

describe("Project", () => {
  let project = null;
  before(() => {
    project = new lib.Project({
      paths,
      openapi: {host: 'localhost:3333'},
      events: {
        error: {
          action: storeError,
        },
        http: {
          action: storeHttpEvent,
        },
      },
    });
    return project.serve(3333);
  });

  after(() => project.server.close());

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
      console.log(body.error);
      expect(body.error).to.equal('name: String is too long (14 chars), maximum 10')
      done();
    })
  });

  it('should pass input from config', done => {
    request.get(BASE_URL + '/hello_world', {json: true}, (err, resp, body) => {
      if (err) throw err;
      expect(resp.statusCode).to.equal(200, body.error);
      expect(body).to.equal("Hello, world");
      done();
    })
  });

  it('should not allow HTTP input if config input is specified', done => {
    request.get(BASE_URL + '/hello_world?uppercase=true', {json: true}, (err, resp, body) => {
      if (err) throw err;
      expect(resp.statusCode).to.equal(200, body.error);
      expect(body).to.equal("Hello, world");
      done();
    })
  })

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
  });

  it('should return error on non-int in path', (done) => {
    const obj = {
      name: 'Jordan',
      aliases: ['MJ', 'His Airness'],
    };
    request.post(BASE_URL + '/player/MIKE', {json: true, body: obj}, (err, resp, body) => {
      expect(resp.statusCode).to.equal(400);
      expect(body).to.deep.equal({error: 'id: "MIKE" is not a properly-formatted whole number'});
      done();
    })
  });

  it('should extend parameters with inputSchema', (done) => {
    request.get(BASE_URL + '/hello?uppercase=true&name=world', {json: true}, (err, resp, body) => {
      if (err) throw err;
      expect(resp.statusCode).to.equal(200);
      expect(body).to.equal("HELLO, WORLD");
    })
    done()
  });

  it('should prefer parameter.maxLength to schema.maxLength', (done) => {
    let name = '1234567890abcd';  // max is 10 for param but 20 for inputSchema
    request.get(BASE_URL + '/hello', {qs: {name}, json: true}, (err, resp, body) => {
      expect(resp.statusCode).to.equal(400);
      expect(resp.body).to.deep.equal({error: 'name: String is too long (14 chars), maximum 10'});
      done();
    })
  });

  it('should extend path', (done) => {
    request.get(BASE_URL + '/files/foo.txt', {json: true}, (err, resp, body) => {
      expect(body.extendedPath).to.equal('foo.txt');
      done();
    })
  })

  it('should not extend path too far', (done) => {
    request.get(BASE_URL + '/files/foo/bar.txt', {json: true}, (err, resp, body) => {
      expect(resp.statusCode).to.equal(404);
      done();
    })
  })

  it('should extend existing path param when possible', (done) => {
    request.get(BASE_URL + '/directory/foo.txt', {json: true}, (err, resp, body) => {
      expect(body.filename).to.equal('foo.txt');
      done();
    })
  })

  it('should call error event handler', done => {
    request.get(BASE_URL + '/throw?message=test', {json: true}, (err, resp, body) => {
      expect(resp.statusCode).to.equal(500);
      expect(lastError).to.not.equal(null);
      expect(lastError.message).to.equal('test');
      done();
    })
  });

  it('should call http event handler', (done) => {
    request.get(BASE_URL + '/statusCode?statusCode=418', {json: true}, (err, resp, body) => {
      expect(resp.statusCode).to.equal(418);
      expect(lastHttpEvent.statusCode).to.equal(418);
      done();
    })
  });

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
  });
})

