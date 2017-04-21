let getParameterNames = require('get-parameter-names');
let Context = require('./context');

let Flow = module.exports = function(context) {
  context = context || new Context();
  let nextResultIdx = -1;

  function wrapPromise(promise, resultName) {
    let then = promise.then.bind(promise);
    promise.then = function(fn, reject) {
      let params = fn ? getParameterNames(fn) : [];
      let fnWrapper = function(result) {
        if (nextResultIdx >= 0) {
          context.results[nextResultIdx++] = result;
          if (params[0]) context.results[params[0]] = result;
        } else {
          ++nextResultIdx;
        }
        if (fn) return fn(result);
      }
      let newPromise = then(fnWrapper, reject);
      return wrapPromise(newPromise);
    }
    return promise;
  }

  return wrapPromise(Promise.resolve());
}
