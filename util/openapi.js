let openapi = module.exports = {};

openapi.initialize = function(spec, derefDefs=true) {
  if (derefDefs) {
    spec = dereference(spec, spec);
  } else {
    spec.paths = dereference(spec.paths, spec);
  }
  for (let path in spec.paths) {
    let pathParams = spec.paths[path].parameters || [];
    delete spec.paths[path].parameters;
    for (let method in spec.paths[path]) {
      let op = spec.paths[path][method];
      op.parameters = op.parameters || [];
      op.parameters = op.parameters.concat(pathParams);
    }
  }
  return spec;
}

function resolveReference(ref, base, cache={}) {
  if (cache[ref]) return cache[ref];
  var keys = ref.split('/');
  keys.shift();
  var cur = base;
  keys.forEach(k => cur = cur[k]);
  return cache[ref] = cur;
}

function dereference(obj, base, cache={}) {
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; ++i) {
      obj[i] = dereference(obj[i], base, cache);
    }
    return obj;
  } else if (typeof obj === 'object') {
    for (var key in obj) {
      var val = obj[key];
      if (key === '$ref' && typeof val === 'string') {
        return resolveReference(val, base, cache);
      } else {
        if (val && val.$ref && cache[val.$ref]) obj[key] = cache[val.$ref];
        else obj[key] = dereference(val, base, cache);
      }
    }
  }
  return obj;
}


