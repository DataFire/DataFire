"use strict";
let expect = require('chai').expect;

let datafire = require('../entry');

describe("Response", () => {
  it('should allow json option', () => {
    let resp = new datafire.Response({
      statusCode: 401,
      json: {error: "Foo"},
    });
    expect(resp.headers['Content-Type']).to.equal('application/json');
    expect(resp.body).to.equal(JSON.stringify({error: "Foo"}, null, 2));
  })
})
