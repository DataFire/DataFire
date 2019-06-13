"use strict";
let expect = require('chai').expect;
let zlib = require('zlib');
let datafire = require('../entry');

let echo = new datafire.Action({
  handler: (input, context) => {
    return context.request;
  }
})

let encode = new datafire.Action({
  inputs: [{
    title: 'encoding',
    type: 'string',
    enum: ['gzip', 'deflate'],
  }, {
    title: 'message',
    type: 'string',
  }],
  handler: (input) => {
    let message = null;
    if (input.encoding === 'gzip') {
      message = zlib.gzipSync(input.message);
    } else if (input.encoding === 'deflate') {
      message = zlib.deflateSync(input.message);
    }
    return new datafire.Response({
      headers: {
        'Content-Encoding': input.encoding,
      },
      body: message,
    })
  }
})

let project = new datafire.Project({
  id: 'test_project',
  paths: {
    '/hello': {
      get: {
        action: echo,
      }
    },
    '/bye/{name}': {
      post: {
        action: echo,
      }
    },
    '/dupeParam/{foo}': {
      get: {
        action: echo,
      }
    },
    '/encode': {
      get: {
        action: encode,
      }
    },
    '/form': {
      post: {
        action: echo,
      }
    }
  }
})

let integration = datafire.Integration.fromOpenAPI({
  host: 'localhost:3333',
  swagger: '2.0',
  info: {version: '1.0'},
  schemes: ['http'],
  paths: {
    '/hello': {
      get: {
        responses: {
          200: {
            description: "OK"
          }
        },
        parameters: [{
          name: 'name',
          in: 'query',
          type: 'string',
        }, {
          name: 'head',
          in: 'header',
          type: 'string',
        }]
      },
    },
    '/bye/{name}': {
      post: {
        responses: {
          200: {
            description: "OK"
          }
        },
        parameters: [{
          name: 'name',
          in: 'path',
          required: true,
          type: 'string',
        }, {
          name: 'body',
          in: 'body',
          schema: {
            properties: {
              bar: {type: 'string'},
            }
          }
        }]
      }
    },
    '/encode': {
      get: {
        parameters: [{
          name: 'encoding',
          type: 'string',
          in: 'query',
        }, {
          name: 'message',
          type: 'string',
          in: 'query',
        }],
        responses: {
          200: {description: 'OK'},
        }
      }
    },
    '/dupeParam/{foo}': {
      parameters: [{
        name: 'foo',
        in: 'path',
        type: 'string',
        required: true,
      }, {
        name: 'foo',
        in: 'header',
        type: 'string',
      }],
      get: {
        parameters: [{
          name: 'foo',
          in: 'query',
          type: 'string',
        }],
        responses: {
          200: {
            description: "OK",
          }
        }
      }
    },
    '/form': {
      post: {
        parameters: [{
          name: 'foo',
          in: 'formData',
          type: 'boolean',
          required: true,
        }],
        responses: {
          200: {
            description: "OK"
          }
        },
      }
    }
  }
}, 'test_integration')

describe('Integration', () => {

  before(() => {
    return project.serve(3333)
  })

  after(() => {
    project.server.close();
  })

  it("should build from OpenAPI", () => {
    expect(integration instanceof datafire.Integration).to.equal(true);
    expect(Object.keys(integration.actions).length).to.equal(5);
    let action = integration.actions.hello.get.action;
    expect(action instanceof datafire.Action).to.equal(true);
  });

  it("should pass query parameters", () => {
    return integration.actions.hello.get({name: 'world'})
      .then(data => {
        expect(data.query).to.deep.equal({name: 'world'});
      })
  });

  it("should pass header parameters", () => {
    return integration.actions.hello.get({head: 'foo'})
      .then(data => {
        expect(data.headers.head).to.equal('foo');
      })
  });

  it("should pass body parameter", () => {
    return integration.actions.bye.name.post({
      name: 'foo',
      body: {'bar': 'baz'},
    }).then(data => {
      expect(data.path).to.equal('/bye/foo');
      expect(data.body).to.deep.equal({bar: 'baz'});
    })
  });

  it('should allow overriding the host', () => {
    let ctx = new datafire.Context({
      accounts: {
        test_integration: {
          host: 'http://localhost:3334',
        }
      }
    });
    return integration.actions.hello.get({name: 'world'}, ctx)
        .then(_ => {throw new Error("shouldn't reach here")})
        .catch(e => expect(e.message).to.contain('ECONNREFUSED 127.0.0.1:3334'));
  })

  it('should handle duplicate parameter names', () => {
    let action = integration.actions.dupeParam.foo.get.action;
    expect(Object.keys(action.inputSchema.properties)).to.deep.equal(['foo_query', 'foo', 'foo_header']);
    return action.run({
      foo: 'a',
      foo_query: 'b',
      foo_header: 'c',
    }).then(data => {
      expect(data.path).to.equal('/dupeParam/a');
      expect(data.query).to.deep.equal({foo: 'b'});
      expect(data.headers.foo).to.equal('c');
    })
  })

  it('should parse boolean form parameters', () => {
    let action = integration.actions.form.post.action;
    return action.run({
      foo: true,
    }).then(data => {
      expect(data.body).to.deep.equal({foo: 'true'});
    })
  })

  it('should decode gzip', () => {
    let action = integration.actions.encode.get.action;
    return action.run({
      encoding: 'gzip',
      message: 'hello',
    }).then(data => {
      expect(data).to.equal('hello');
    })
  })

  it('should decode deflate', () => {
    let action = integration.actions.encode.get.action;
    return action.run({
      encoding: 'deflate',
      message: 'hello',
    }).then(data => {
      expect(data).to.equal('hello');
    })
  })

  it('should handle circular refs', () => {
    let openapi = {
      host: 'api.acme.com',
      swagger: '2.0',
      info: {version: 'v1'},
      definitions: {
        Circle: {
          type: 'object',
          properties: {
            circles: {
              type: 'array',
              items: {$ref: '#/definitions/Circle'},
            }
          }
        }
      },
      parameters: {
        CircleBody: {
          in: 'body',
          name: 'body',
          required: true,
          schema: {$ref: '#/definitions/Circle'},
        }
      },
      paths: {
        '/foo': {
          get: {
            parameters: [{
              $ref: '#/parameters/CircleBody',
            }],
            responses: {
              200: {
                description: "OK",
                schema: {$ref: '#/definitions/Circle'}
              }
            }
          }
        }
      }
    };
    let integration = datafire.Integration.fromOpenAPI(JSON.parse(JSON.stringify(openapi)));
    let action = integration.actions.foo.get.action;
    expect(action.inputSchema).to.deep.equal({
      type: 'object',
      additionalProperties: false,
      required: ['body'],
      properties: {
        body: {
          $ref: '#/definitions/Circle',
        }
      },
      definitions: openapi.definitions,
    });
    expect(action.outputSchema).to.deep.equal({
      definitions: openapi.definitions,
      $ref: '#/definitions/Circle',
    })
  })
})
