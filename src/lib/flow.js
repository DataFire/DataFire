let getParameterNames = require('@captemulation/get-parameter-names');
let Context = require('./context');

let Flow = module.exports = function(context) {
  context = context || new Context();
  let nextResultIdx = -1;
  let results = {};

  function wrapPromise(promise, resultName) {
    let then = promise.then.bind(promise);
    promise.then = function(fn, reject) {
      let params = fn ? getParameterNames(fn) : [];
      let fnWrapper = function(result) {
        if (nextResultIdx >= 0) {
          results[nextResultIdx++] = result;
          if (params[0]) results[params[0]] = result;
        } else {
          ++nextResultIdx;
        }
        context.results = results;
        if (fn) {
          return fn(result);
        }
      }
      let newPromise = then(fnWrapper, reject);
      return wrapPromise(newPromise);
    }
    return promise;
  }

  return wrapPromise(Promise.resolve());
}
