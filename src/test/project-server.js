"use strict";

const fs = require('fs');
const expect = require('chai').expect;
const request = require('request');
const swaggerParser = require('swagger-parser');
const lib = require('../entry');

const DEFAULT_CACHE_TIME = 100;

const echo = new lib.Action({
  handler: input => input,
})

const getTime = new lib.Action({
  handler: _ => Promise.resolve(Date.now()),
})

const getPerson = new lib.Action({
  inputs: [{
    title: 'name',
    type: 'string',
    minLength: 1,
  }, {
    title: 'age',
    type: 'integer',
    default: -1,
  }]
})

const makePerson = new lib.Action({
  inputSchema: {
    type: 'object',
    required: ['name', 'age'],
    properties: {
      name: {
        type: 'string',
        maxLength: 100,
        minLength: 1,
      },
      age: {
        type: 'integer',
        minimum: 0,
      },
      nicknames: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          minLength: 1,
        }
      },
      address: {
        type: 'object',
        required: ['street', 'city'],
        properties: {
          street: {
            type: 'object',
            required: ['number', 'name'],
            properties: {
              number: {type: 'integer'},
              name: {type: 'string'},
            }
          },
          city: {type: 'string', minLength: 1},
          zip: {type: 'integer'},
        }
      }
    }
  },
  handler: _ => "Success",
})

const paths = {
    '/time': {
      get: {
        action: getTime,
      }
    },
    '/time_delayed': {
      get: {
        action: getTime,
        cache: DEFAULT_CACHE_TIME * 2,
      }
    },
    '/time_fresh': {
      get: {
        action: getTime,
        cache: false,
      }
    },
    '/person': {
      get: {
        action: getPerson,
      },
      post: {
        action: makePerson,
      }
    },
    '/echo': {
      post: {
        action: echo,
      }
    }
}
const BASE_URL = 'http://localhost:3333';

function req(path, opts) {
  opts = opts || {};
  if (opts.json === undefined) opts.json = true;
  opts.method = opts.method || 'get';
  return new Promise((resolve, reject) => {
    request(BASE_URL + path, opts, (err, resp, body) => {
      if (err) reject(err);
      else if (resp.statusCode >= 300) reject({statusCode: resp.statusCode, body});
      else resolve(body);
    })
  })
}

function timeoutPromise(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), ms)
  });
}
describe("Project Server", () => {
  let project = null;
  before(() => {
    project = new lib.Project({
      paths,
      options: {
        cache: DEFAULT_CACHE_TIME,
        bodyLimit: 1000,
      },
      openapi: {host: 'localhost:3333'},
    });
    return project.serve(3333);
  });

  after(() => project.server.close());

  it('should respect top-level cache option', () => {
    let firstTime = null;
    return req('/time')
      .then(time => {
        expect(time).to.be.a('number');
        firstTime = time;
        return req('/time');
      })
      .then(time => {
        expect(time).to.equal(firstTime);
        return timeoutPromise(DEFAULT_CACHE_TIME + 10).then(_ => req('/time'));
      })
      .then(time => {
        expect(time).to.be.a('number');
        expect(time).to.not.equal(firstTime);
      });
  });

  it('should respect cache override for path', () => {
    let firstTime = null;
    return req('/time_delayed')
      .then(time => {
        expect(time).to.be.a('number');
        firstTime = time;
        return req('/time_delayed');
      })
      .then(time => {
        expect(time).to.equal(firstTime);
        return timeoutPromise(DEFAULT_CACHE_TIME + 10).then(_ => req('/time_delayed'));
      })
      .then(time => {
        expect(time).to.equal(firstTime);
        return timeoutPromise(DEFAULT_CACHE_TIME + 10).then(_ => req('/time_delayed'));
      })
      .then(time => {
        expect(time).to.be.a('number');
        expect(time).to.not.equal(firstTime);
      });
  })

  it('should respet cache disable for path', () => {
    let firstTime = null;
    return req('/time_fresh')
      .then(time => {
        expect(time).to.be.a('number');
        return req('/time_fresh')
      })
      .then(time => {
        expect(time).to.be.a('number');
        expect(time).to.not.equal(firstTime);
      })
  });

  it('should respect bodyLimit', () => {
    let name = "a";
    for (let i = 0; i < 10; ++i) name += name;
    return req('/person', {body: {name}, method: 'post'})
      .then(_ => {throw new Error("Shouldn't reach here")})
      .catch(e => {
        expect(e.statusCode).to.equal(413)
        expect(e.body.error).to.equal('request entity too large');
      })
  })

  it('should return pretty errors for bad query param', () => {
    function checkError(qs, expected) {
      return req('/person', {qs})
        .then(_ => {throw new Error("Shouldn't reach here")})
        .catch(e => {
          expect(e.statusCode).to.equal(400);
          expect(e.body.error).to.equal(expected);
        })
    }
    return Promise.all([
      checkError({}, "Missing required query parameter \"name\""),
      checkError({name: ''}, "name: String is too short (0 chars), minimum 1"),
    ])
  })

  it('should return pretty errors for bad body param', () => {
    function checkError(person, expected) {
      let opts = {method: 'post', body: person};
      return req('/person', opts)
        .then(_ => {throw new Error("Shouldn't reach here")})
        .catch(e => {
          expect(e.statusCode).to.equal(400);
          expect(e.body.error).to.equal(expected);
        })
    }

    return Promise.all([
      checkError({name: "Morty"}, "body: Missing required property: age"),
      checkError({name: "Morty", age: -1}, "age: Value -1 is less than minimum 0"),
      checkError({name: "Morty", age: 'Rick'}, "age: Invalid type: string (expected integer)"),
      checkError({name: "Morty", age: 14, nicknames: []}, 'nicknames: Array is too short (0), minimum 1'),
      checkError({name: "Morty", age: 14, nicknames: ['foo', '']}, 'nicknames.1: String is too short (0 chars), minimum 1'),
      checkError({name: "Morty", age: 14, address: {}}, 'address: Missing required property: street'),
      checkError({name: "Morty", age: 14, address: {street: {}, city: 'NYC'}}, 'address.street: Missing required property: number'),
      checkError({name: "Morty", age: 14, address: {street: {name: '', number: 0}, city: ''}}, 'address.city: String is too short (0 chars), minimum 1'),
    ]);
  })

  it('should allow JSON input for POST operation', () => {
    let body = {name: 'foo'};
    return req('/echo', {method: 'post', body})
      .then(input => {
        expect(input).to.deep.equal(body);
      })
  })

  it('should allow form-encoded input for POST operation', () => {
    let form = {name: 'foo'};
    return req('/echo', {method: 'post', form})
      .then(input => {
        expect(input).to.deep.equal(form);
      })
  })
});
