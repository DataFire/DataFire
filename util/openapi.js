let openapi = module.exports = {};

openapi.PATH_PARAM_REGEX = /\{([^\}]+)\}/g;
openapi.PARAM_SCHEMA_FIELDS = [
  'format', 'description', 'pattern', 'enum',
  'maximum', 'minimum', 'exclusiveMaximum', 'exclusiveMinimum',
  'maxLength', 'minLength',
  'maxItems', 'minItems', 'uniqueItems',
  'multipleOf',
]

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

openapi.getOperation = (method, path, pathOp) => {
  let op = {
    parameters: pathOp.parameters || [],
    responses: pathOp.responses,
    operationId: pathOp.operationId || pathOp.action.title,
    description: pathOp.description || pathOp.action.description,
  }
  if (!op.operationId) delete op.operationId;
  if (!op.description) delete op.description;
  function maybeAddParam(param) {
    let existing = op.parameters.filter(p => p.name === param.name && p.in === param.in)[0];
    if (existing) return;
    op.parameters.push(param);
  }
  let pathParams = path.match(openapi.PATH_PARAM_REGEX) || [];
  pathParams.map(p => ({
    in: 'path',
    required: true,
    name: p.substring(1, p.length - 1),
    type: 'string',
  })).forEach(maybeAddParam);

  let needsBody = method === 'post' || method === 'patch' || method === 'put';
  let hasBody = !!op.parameters.filter(p => p.in === 'formData' || p.in === 'body').length;
  if (needsBody && !hasBody) {
    op.parameters.push({
      in: 'body',
      name: 'body',
      schema: pathOp.action.inputSchema,
    })
  }
  let requiredProps = pathOp.action.inputSchema.required || [];
  Object.keys(pathOp.action.inputSchema.properties || {}).forEach(prop => {
    let param = op.parameters.filter(p => p.name === prop)[0];
    if (!param && !needsBody) {
      param = {in: 'query', name: prop};
      op.parameters.push(param);
    }
    if (param) {
      let schema = pathOp.action.inputSchema.properties[prop];
      param.type = schema.type;
      openapi.PARAM_SCHEMA_FIELDS
          .filter(f => param[f] === undefined)
          .filter(f => schema[f] !== undefined)
          .forEach(f => param[f] = schema[f]);
      if (requiredProps.indexOf(param.name) !== -1) param.required = true;
    }
  });
  op.parameters.forEach(p => {
    if (p.in === 'body') op.consumes = ['application/json'];
    else if (p.in === 'formData') op.consumes = ['application/x-www-form-urlencoded'];
  })
  if (!op.responses) {
    op.responses = {
      200: {
        description: 'Success',
        schema: pathOp.action.outputSchema,
      },
      400: {
        description: 'Invalid request',
        schema: {
          properties: {
            error: {type: 'string'},
          }
        }
      },
      500: {
        description: 'Unknown error',
        schema: {
          properties: {
            error: {type: 'string'},
          }
        }
      }
    }
  }
  return op;
}


