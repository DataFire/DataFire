"use strict";
let expect = require('chai').expect;
const datafire = require('../entry');

describe('Flow', () => {
  it('should keep track of results', () => {
    let context = new datafire.Context();
    let resultSet = ['result0', ['foo', 'bar'], 23];
    let results = {
      0: resultSet[0],
      1: resultSet[1],
      2: resultSet[2],
      r0: resultSet[0],
      r1: resultSet[1],
    }
    return Promise.resolve().then(_ => {
      return datafire.flow(context)
        .then(_ => results[0])
        .then(r0 => {
          expect(r0).to.equal(results[0]);
          expect(r0).to.equal(results.r0);
          return new Promise((resolve, reject) => {
            setTimeout(_ => resolve(results[1], 10))
          })
        })
        .then(r1 => {
          expect(r1).to.equal(results[1]);
          expect(r1).to.equal(results.r1);
          return results[2];
        })
    })
    .then(_ => {
      let version = require('../util/node-version');
      if (version <= 4) {
        delete results[2]; // FIXME: last result not getting added in node v4.2
      }
      expect(context.results).to.deep.equal(results);
    })
  });

  it('should allow nested flows', () => {
    let action1 = new datafire.Action({
      handler: (input, context) => {
        return datafire.flow(context)
          .then(_ => "action1")
          .then(a1 => {
            expect(context.results.a1).to.equal("action1")
            return "result1"
          });
      }
    })
    let action2 = new datafire.Action({
      handler: (input, context) => {
        return datafire.flow(context)
          .then(_ => "action2")
          .then(a2 => {
            expect(context.results.a1).to.equal(undefined)
            expect(context.results.a2).to.equal("action2")
            return "result2"
          });
      }
    })
    let mainContext = new datafire.Context();
    return datafire.flow(mainContext)
      .then(_ => action1.run(null, mainContext))
      .then(_ => "result1.5")
      .then(_ => action2.run(null, mainContext))
      .then(_ => {
        expect(mainContext.results[0]).to.equal('result1')
        expect(mainContext.results[1]).to.equal('result1.5')
        expect(mainContext.results[2]).to.equal('result2')
        expect(mainContext.results.a1).to.equal(undefined);
        expect(mainContext.results.a2).to.equal(undefined);
      })
  })

  it('should allow nested promises', () => {
    let context = new datafire.Context();
    return Promise.resolve()
      .then(_ => {
        return datafire.flow(context)
          .then(_ => {
            return new Promise(resolve => {
              setTimeout(_ => resolve(0), 10);
            }).then(zero => {
              return 1;
            })
          })
          .then(result => {
            expect(result).to.equal(1);
            expect(context.results).to.deep.equal({
              0: 1,
              result: 1,
            })
          })
      })
  })

  it('should allow error handling', () => {
    let context = new datafire.Context();
    return datafire.flow(context)
      .then(_ => Promise.reject('err1'))
      .then(_ => {
        throw new Error("shouldn't reach here");
      })
      .catch(e => {
        expect(e).to.equal('err1');
      })
  });

  it('should allow nested error handling', () => {
    let context = new datafire.Context();
    return datafire.flow(context)
      .then(_ => {
        return Promise.resolve()
          .then(_ => {
            return Promise.reject("err2")
          })
      })
      .then(_ => {
        throw new Error("shouldn't reach here");
      })
      .catch(e => {
        expect(e).to.equal('err2');
      })
  })
})
