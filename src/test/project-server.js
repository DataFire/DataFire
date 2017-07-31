"use strict";

const fs = require('fs');
const expect = require('chai').expect;
const request = require('request');
const swaggerParser = require('swagger-parser');
const lib = require('../entry');

const DEFAULT_CACHE_TIME = 100;

const getTime = new lib.Action({
  handler: _ => Promise.resolve(Date.now()),
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
    }
}
const BASE_URL = 'http://localhost:3333';

function req(path, opts={}) {
  opts.json = true;
  return new Promise((resolve, reject) => {
    request.get(BASE_URL + path, opts, (err, resp, body) => {
      if (err) reject(err);
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
  })
});
