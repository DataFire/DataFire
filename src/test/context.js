'use strict';
let datafire = require('../entry');
let expect = require('chai').expect;

describe('Context', function() {
  it('should copy accounts object', function() {
    let accounts = {user: {id: 3}};
    let ctx = new datafire.Context({accounts});
    accounts.user = {id: 4};
    expect(ctx.accounts.user.id).to.equal(3);
  })
})
