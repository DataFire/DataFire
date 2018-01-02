'use strict';

let expect = require('chai').expect
let request = require('request-promise');
let datafire = require('../../entry');

let project = datafire.Project.fromDirectory(__dirname + '/proj');

const PORT = 3333;

describe('Project Structure', function() {
  before(function() {
    return project.startServer(PORT);
  })
  after(function() {
    project.server.close();
  })

  it('should allow integration aliases', function() {
    request.get('http://localhost:' + PORT + '/hello', {json: true})
      .then(data => expect(data).to.equal("Hi!"));
  });

  it('should allow action aliases', function() {
    request.get('http://localhost:' + PORT + '/bye', {json: true})
      .then(data => expect(data).to.equal("Bye!"));
  });

  it('should add variables in DataFire.yml to context', function() {
    expect(project.getContext().variables.custom_id).to.equal('foo');
  })
})
