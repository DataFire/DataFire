'use strict';

let datafire = require('../entry');
let expect = require('chai').expect;

let integ = new datafire.Integration({
  id: 'test_integration',
  security: {
    test_integration: {
      fields: {
        password: 'your password',
      }
    }
  }
});

integ.addAction('password.get', {
  handler: (input, context) => {
    return context.accounts.test_integration.password;
  }
})

integ.addAction('echoContext', {
  handler: (input, context) => context
})

let integInstance = integ.create({password: 'foobar'});

describe('IntegrationInstance', () => {
  it('should use account set at top level', () => {
    return integInstance.password.get()
      .then(pw => expect(pw).to.equal('foobar'));
  });

  it('should not use account passed to action', () => {
    let ctx = new datafire.Context({
      accounts: {
        test_integration: {password: 'baz'}
      }
    });
    return integInstance.password.get({}, ctx)
      .then(pw => expect(pw).to.equal('foobar'))
  });

  it('should still have access to local context', () => {
    let ctx = new datafire.Context({
      type: 'http',
      accounts: {
        test_integration: {password: 'baz'}
      }
    });
    return integInstance.echoContext({}, ctx)
      .then(ctxOut => {
        expect(ctxOut.accounts.test_integration.password).to.equal('foobar');
        expect(ctxOut.type).to.equal('http');
      })
  });

  it('should not have access to extra accounts', () => {
    let ctx = new datafire.Context({
      accounts: {
        other_integration: {password: 'baz'}
      }
    });
    return integInstance.echoContext({}, ctx)
      .then(ctx => expect(ctx.accounts.other_integration).to.equal(undefined))
  })
})
