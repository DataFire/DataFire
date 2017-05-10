"use strict";

const expect = require('chai').expect;
const datafire = require('../entry');
const Action = datafire.Action;

describe('Action', () => {
  it('should have a default handler', () => {
    let action = new Action();
    return action.run().then(result => {
      expect(result).to.equal(null);
    })
  });

  it('should use argument handler', () => {
    let action = new Action({
      handler: input => {
        return Promise.resolve('foo');
      }
    });
    return action.run().then(result => {
      expect(result).to.equal('foo');
    })
  });

  it('should allow any input with no schema', () => {
    let action = new Action({
      handler: input => {
        return Promise.resolve('foo');
      }
    });
    return Promise.all([
      action.run().then(result => {
        expect(result).to.equal('foo');
      }),
      action.run({}).then(result => {
        expect(result).to.equal('foo');
      }),
      action.run('bar').then(result => {
        expect(result).to.equal('foo');
      }),
      action.run(['bar', 'baz']).then(result => {
        expect(result).to.equal('foo');
      }),
    ])
  });

  it('should validate against inputSchema', (done) => {
    let action = new Action({
      inputSchema: {type: 'string', maxLength: 3},
      handler: input => Promise.resolve('foo'),
    });
    Promise.all([
      action.run().then(_ => {
        throw new Error("Should not succeed");
      }).catch(e => {
        expect(e.message).to.be.a('string');
      }),
      action.run('bar').then(result => {
        expect(result).to.equal('foo');
      }),
      action.run('bars').then(_ => {
        throw new Error("Should not succeed")
      }).catch(e => {
        expect(e.message).to.be.a('string');
      })
    ]).then(_ => done());
  });

  it('should accept inputs as array', () => {
    let action = new Action({
      inputs: [{
        title: 'name',
        type: 'string',
        default: 'Unknown',
      }, {
        title: 'age',
        type: 'integer',
        minimum: 0,
      }],
      handler: input => `${input.name} is age ${input.age}`,
    });

    return Promise.all([
      action.run({
        name: 'Lucy',
        age: 2,
      })
        .then(msg => expect(msg).to.equal('Lucy is age 2')),

      action.run({
        name: 'Lucy',
      })
        .then(_ => {
          throw new Error("Shouldn't reach here");
        })
        .catch(e => {
          expect(e.message).to.equal("data should have required property 'age'");
        }),

      action.run({
        name: 'Lucy',
        age: -2,
      })
        .then(_ => {
          throw new Error("Shouldn't reach here")
        })
        .catch(e => expect(e.message).to.equal("data.age should be >= 0")),

      action.run({age: 1})
        .then(msg => expect(msg).to.equal('Unknown is age 1'))
    ])
  })

  it('should allow error handling', () => {
    let action = new Action({
      handler: input => {
        return Promise.resolve()
          .then(_ => Promise.reject("err1"))
          .then(_ => {
            throw new Error("shouldn't reach here")
          })
          .catch(e => {
            expect(e).to.equal("err1")
          })
      }
    })
    return action.run();
  });

  it('should allow thrown errors', () => {
    let action = new Action({
      handler: input => {
        return Promise.resolve()
          .then(_ => {throw new Error("err1")})
          .then(_ => {throw new Error("shouldn't reach here")})
          .catch(e => {
            expect(e.message).to.equal('err1');
          })
      }
    })
    return action.run();
  })

  it('should require accounts', () => {
    let action = new Action({
      security: {
        acct1: {},
        acct2: {optional: true},
      },
      handler: _ => "Success",
    })

    let validContext = new datafire.Context({
      accounts: {
        acct1: {},
      }
    });
    let invalidContext = new datafire.Context({
      accounts: {
        acct2: {},
      }
    })

    return action.run()
      .then(_ => {throw new Error("shouldn't reach here")})
      .then(_ => action.run(null, invalidContext))
      .catch(e => expect(e.message).to.contain('Account acct1 not specified'))
      .then(_ => action.run(null, invalidContext))
      .then(_ => {throw new Error("shouldn't reach here")})
      .catch(e => expect(e.message).to.contain('Account acct1 not specified'))
      .then(_ => action.run(null, validContext))
      .then(msg => expect(msg).to.equal("Success"));
  })

  it('should allow null input if there are no required inputs', () => {
    let action = new Action({
      inputs: [{
        title: 'foo',
        type: 'string',
        default: '',
      }],
      handler: input => input.foo,
    });
    return action.run(null)
      .then(msg => expect(msg).to.equal(''))
  })
})
