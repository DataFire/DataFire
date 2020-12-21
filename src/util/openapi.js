"use strict";

let openapi = module.exports = {};

openapi.METHODS = ['get', 'put', 'post', 'patch', 'delete', 'options', 'head'];
openapi.EXTENDED_PATH_PARAM_NAME = '_extendedPathPart';
openapi.EXTENDED_PATH_PARAM_REGEX = new RegExp('^' + openapi.EXTENDED_PATH_PARAM_NAME + '(\\d+)$');
openapi.EXTENDED_PATH_FINAL_PARAM_REGEX = new RegExp('\\{([^\\/]+)\\}/\\{' + openapi.EXTENDED_PATH_PARAM_NAME + '0\\}');

openapi.PATH_PARAM_REGEX = /\{([^\}]+)\}/g;
openapi.PARAM_SCHEMA_FIELDS = [
  'format', 'description', 'pattern', 'enum',
  'maximum', 'minimum', 'exclusiveMaximum', 'exclusiveMinimum',
  'maxLength', 'minLength',
  'maxItems', 'minItems', 'uniqueItems',
  'multipleOf',
  'default',
]

openapi.initialize = function(spec) {
  for (let path in spec.paths) {
    if (spec.paths[path].$ref) {
      let ref = resolveReference(spec.paths[path].$ref, spec);
      for (let key in ref) spec.paths[path][key] = ref[key];
    }
    let pathParams = spec.paths[path].parameters || [];
    delete spec.paths[path].parameters;
    for (let method in spec.paths[path]) {
      if (openapi.METHODS.indexOf(method) === -1) continue;
      let op = spec.paths[path][method];
      if (spec.security) {
        op.security = op.security || spec.security;
      }
      op.parameters = op.parameters || [];
      op.parameters = op.parameters.concat(pathParams);
      op.parameters = op.parameters.map(param => {
        if (param.$ref) return resolveReference(param.$ref, spec)
        else return param;
      })
      op.parameters = op.parameters.filter((param, idx) => {
        let matching = op.parameters.filter((p, idx2) => {
          return idx2 > idx && p.name === param.name && p.in === param.in
        });
        if (!matching.length) return true;
      })

      for (let resp in op.responses) {
        if (op.responses[resp].$ref) {
          op.responses[resp] = resolveReference(op.responses[resp].$ref, spec);
        }
      }
    }
  }
  return spec;
}

openapi.dereferenceSchema = function(schema) {
  return dereference(schema, {definitions: schema.definitions});
}

function resolveReference(ref, base, cache) {
  cache = cache || {};
  if (cache[ref]) return cache[ref];
  var keys = ref.split('/');
  keys.shift();
  var cur = base;
  keys.forEach(k => cur = cur[k] || {});
  return cache[ref] = cur;
}

function dereference(obj, base, cache) {
  cache = cache || {};
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

openapi.getOperationId = (method, path, op) => {
  if (op.operationId) {
    if (/^\w+(\.\w+)*$/.test(op.operationId)) {
      return op.operationId;
    }
  }
  let opId = path.substring(1)
      .replace(/\//g, '.')
      .replace(/\.$/, '')
      .replace(/\{/g, '')
      .replace(/\}/g, '')
      .replace(/[^\w\.]+/g, '_')
  opId += '.' + method;
  return opId;
}

openapi.getUniqueNames = (params) => {
  let names = params.map(p => p.name);
  return names.map((name, idx) => {
    let sameName = params.filter(p => p.name === name);
    if (sameName.length === 1) return name;
    let best = sameName.filter(p => p.required)[0] || sameName.pop();
    let param = params[idx];
    if (param === best) return name;
    return name + '_' + param.in;
  })
}

openapi.getOperation = (method, path, trigger) => {
  let op = {
    parameters: trigger.parameters || [],
    responses: trigger.responses,
    security: trigger.security,
    operationId: trigger.operationId || trigger.action.title,
    description: trigger.description || trigger.action.description,
    'x-datafire': {
      action: trigger.action.id,
    }
  }
  if (!op.security) delete op.security;
  if (!op.operationId) delete op.operationId;
  if (!op.description) delete op.description;
  function maybeAddParam(param) {
    let existing = op.parameters.filter(p => p.name === param.name && p.in === param.in)[0];
    if (existing) return;
    op.parameters.push(param);
  }
  let pathParams = path.match(openapi.PATH_PARAM_REGEX) || [];
  pathParams = pathParams.map(p => p.substring(1, p.length - 1));
  pathParams.map(p => ({
    in: 'path',
    required: true,
    name: p,
    type: 'string',
  })).forEach(maybeAddParam);

  let needsBody = method === 'post' || method === 'patch' || method === 'put';
  let hasBody = !!op.parameters.filter(p => p.in === 'formData' || p.in === 'body').length;
  if (needsBody && !hasBody) {
    let bodySchema = JSON.parse(JSON.stringify(trigger.action.inputSchema));
    pathParams.forEach(p => {
      if (bodySchema.properties) {
        delete bodySchema.properties[p];
      }
      if (bodySchema.required) {
        bodySchema.required = bodySchema.required.filter(name => name !== p);
        if (!bodySchema.required.length) delete bodySchema.required;
      }
    })
    op.parameters.push({
      in: 'body',
      name: 'body',
      schema: bodySchema,
    });
    op.consumes = ['application/json', 'application/x-www-form-urlencoded'];
  }
  let requiredProps = trigger.action.inputSchema.required || [];
  Object.keys(trigger.action.inputSchema.properties || {}).forEach(prop => {
    let param = op.parameters.filter(p => p.name === prop)[0];
    if (!param && !needsBody) {
      param = {in: 'query', name: prop};
      op.parameters.push(param);
    }
    if (param) {
      let schema = trigger.action.inputSchema.properties[prop];
      param.type = schema.type;
      openapi.PARAM_SCHEMA_FIELDS
          .filter(f => param[f] === undefined)
          .filter(f => schema[f] !== undefined)
          .forEach(f => param[f] = schema[f]);
      if (requiredProps.indexOf(param.name) !== -1) param.required = true;
    }
  });
  if (!op.consumes) {
    op.parameters.forEach(p => {
      if (p.in === 'body')          op.consumes = ['application/json'];
      else if (p.in === 'formData') op.consumes = ['application/x-www-form-urlencoded'];
    })
  }
  if (!op.responses) {
    op.responses = {
      200: {
        description: 'Success',
        //schema: trigger.action.outputSchema,  // FIXME: outputSchema parsing fails if it contains $refs to an integration
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

const SEPARATORS = {
  csv: ',',
  tsv: '\t',
  ssv: ' ',
  pipes: '|',
}
module.exports.getCollectionFormatSeparator = function(type) {
  type = type || 'csv';
  return SEPARATORS[type];
}

module.exports.getBestScheme = function(schemes) {
  if (!schemes) return 'http';
  if (schemes.indexOf('https') !== -1) return 'https';
  return schemes[0];
}
