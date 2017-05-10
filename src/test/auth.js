"use strict";

const request = require('request');
const expect = require('chai').expect;

const project = require('./auth/project');
const saas1 = require('./auth/saas1');
const saas2 = require('./auth/saas2');
const oauth = require('./auth/oauth');

const PROJECT_URL = 'http://localhost:3333';
const SAAS1_URL = 'http://localhost:3334';
const SAAS2_URL = 'http://localhost:3335';
const OAUTH_URL = 'http://localhost:3336';

const datafire = require('../entry');

describe('Authorization', () => {

  before(() => {
    return Promise.all([
      project.serve(3333),
      saas1.serve(3334),
      saas2.serve(3335),
      oauth.serve(3336),
    ])
  })

  after(() => {
    project.server.close();
    saas1.server.close();
    saas2.server.close();
    oauth.server.close();
  });

  it('should return 401 for no auth', done => {
    request.get(PROJECT_URL + '/me', {json: true}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(401, body);
      done();
    })
  });

  it('should return 200 for auth', done => {
    request.get(PROJECT_URL + '/me', {json: true, headers: {Authorization: 'jack'}}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(200, body.error);
      expect(body).to.equal("You are logged in as Jack White");
      done();
    })
  });

  it('should return 200 for public endpoint with no auth', done => {
    request.get(PROJECT_URL + '/public', {json: true}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(200);
      done();
    })
  })

  it('should show user files from saas2', done => {
    request.get(PROJECT_URL + '/saas2/files', {json: true, headers: {Authorization: 'jack'}}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(200, body.error);
      expect(body).to.deep.equal(['foo.txt', 'bar.md']);
      done();
    })
  });

  it('should clear authorization on a second call', done => {
    request.get(PROJECT_URL + '/saas2/files', {json: true, headers: {Authorization: 'meg'}}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(200, body.error);
      expect(body).to.deep.equal([]);
      done();
    })
  });

  it('should return 401 from saas1', done => {
    request.get(SAAS1_URL + '/secret', {json: true}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(401, body);
      done();
    })
  });

  it('should proxy from project to saas1', done => {
    request.get(PROJECT_URL + '/saas1/secret', {json: true, headers: {Authorization: 'jack'}}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(200, body.error);
      expect(body).to.equal('foobar');
      done();
    })
  });

  it('should return 401 for invalid oauth', done => {
    request.get(PROJECT_URL + '/oauth/invalid', {json: true, headers: {Authorization: 'jack'}}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(401, body.error);
      done();
    })
  });

  it('should return 200 for valid oauth', done => {
    request.get(PROJECT_URL + '/oauth/valid', {json: true, headers: {Authorization: 'jack'}}, (err, resp, body) => {
      expect(err).to.equal(null);
      expect(resp.statusCode).to.equal(200, body.error);
      expect(body).to.equal('OK');
      done();
    })
  });

  it('should respect different accounts', () => {
    let jack = new datafire.Context({accounts: {project: {api_key: 'jack'}}});
    let meg = new datafire.Context({accounts: {project: {api_key: 'meg'}}});
    return Promise.resolve()
      .then(_ => project.integration.actions.me({}, jack))
      .then(msg => {
        expect(msg).to.equal("You are logged in as Jack White");
      })
      .then(_ => project.integration.actions.me({}, meg))
      .then(msg => {
        expect(msg).to.equal("You are logged in as Meg White");
      })
      .then(_ => project.integration.actions.me())
      .then(msg => {
        throw new Error("shouldn't reach here")
      })
      .catch(e => {
        expect(e.message).to.contain("Account project not specified");
      })
  })
})
