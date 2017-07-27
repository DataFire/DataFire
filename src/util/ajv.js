const Ajv = require('ajv');
const DEFAULT_OPTIONS = {
  useDefaults: true,
  format: false,
  extendRefs: true,
}
module.exports.getInstance = function(opts) {
  return new Ajv(Object.assign({}, DEFAULT_OPTIONS, opts));
}
