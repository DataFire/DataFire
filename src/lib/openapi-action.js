let openapiUtil = require('../util/openapi');
let request = require('request');
let Action = require('./action');
let Response = require('./response');
let rssParser = require('rss-parser');
let zlib = require('zlib');
const ZLIB_OPTIONS = {
  flush: zlib.Z_SYNC_FLUSH,
  finishFlush: zlib.Z_SYNC_FLUSH
}

const BODY_METHODS = ['put', 'patch', 'post'];

const getActionFromOperation = module.exports = function(method, path, openapi, integration, modifyReq) {
  let op = openapi.paths[path][method];
  let params = op.parameters || [];
  let hasRequiredParam = !!params.filter(p => p.required).length;
  let inputSchema = {
    type: hasRequiredParam ? 'object' : ['object', 'null'],
    properties: {},
    additionalProperties: false,
    definitions: openapi.definitions,
  };
  let names = openapiUtil.getUniqueNames(params);
  params.forEach((param, idx) => {
    let name = names[idx];
    inputSchema.properties[name] = getSchemaFromParam(param);
    if (param.required) {
      inputSchema.required = inputSchema.required || [];
      inputSchema.required.push(name);
    }
  });
  let response = getDefaultResponse(op);
  let outputSchema = Object.assign({definitions: openapi.definitions}, response.schema);
  let actionSecurity = {};
  if (!op.security || op.security.length) {
    actionSecurity = integration.security;
  } else {
    actionSecurity[integration.id] = false;
  }
  return new Action({
    title: op.operationId || (method.toUpperCase() + ' ' + path),
    description: op.description || op.summary,
    inputSchema: params.length ? inputSchema : {},
    outputSchema: outputSchema,
    security: actionSecurity,
    ajv: integration.ajv,
    handler: function(input, ctx) {
      input = input || {};
      let account = ctx.accounts[integration.id];
      let scheme = openapiUtil.getBestScheme(openapi.schemes);
      if (!openapi.host && (!account || !account.host)) {
        throw new Error("The 'host' field must be specified in the " + integration.id + " account");
      }
      let url = (account && account.host) || (scheme + '://' + openapi.host);
      let reqOpts = {
        method,
        url,
        qs: {},
        qsStringifyOptions: {},
        headers: {},
        form: {},
        body: null,
        encoding: null,
      }
      if (openapi.basePath && openapi.basePath !== '/') reqOpts.url += openapi.basePath;
      reqOpts.url += path;

      let addParam = (loc, name, val) => {
        if (val === undefined) return;
        if (loc === 'query') reqOpts.qs[name] = val;
        else if (loc === 'header') reqOpts.headers[name] = val;
        else if (loc === 'path') reqOpts.url = reqOpts.url.replace('{' + name + '}', val);
        else if (loc === 'formData') reqOpts.form[name] = val;
        else if (loc === 'body') reqOpts.body = JSON.stringify(val);
      }
      let names = openapiUtil.getUniqueNames(params);
      params.forEach((param, idx) => {
        let val = input[names[idx]];
        if (param.in === 'query' && Array.isArray(val)) {
          if (param.collectionFormat === 'multi') {
            reqOpts.qsStringifyOptions.arrayFormat = 'repeat';
          } else {
            reqOpts.qsStringifyOptions.sep = openapiUtil.getCollectionFormatSeparator(param.collectionFormat);
          }
        }
        addParam(param.in, param.name, val);
      });

      let hasRefreshToken = false;
      let oauthDef = null;
      if (account) {
        for (let key in openapi.securityDefinitions || {}) {
          let def = openapi.securityDefinitions[key];
          if (def.type === 'basic' && account.username && account.password) {
            let details = account.username + ':' + account.password;
            addParam('header', 'Authorization', "Basic " + new Buffer(details, 'utf8').toString('base64'));
          } else if (def.type === 'apiKey' && account[key]) {
            addParam(def.in, def.name, account[key]);
          } else if (def.type === 'oauth2' && account.access_token) {
            hasRefreshToken = !!account.refresh_token;
            if (!oauthDef || oauthDef.flow === 'implicit') {
              oauthDef = def;
            }
            if (def.in) {
              addParam(def.in, def.name, account.access_token);
            } else {
              addParam('header', 'Authorization', "Bearer " + account.access_token);
            }
          }
        }
      }

      if (Object.keys(reqOpts.form).length === 0) delete reqOpts.form;

      let refreshOAuthToken = (callback) => {
        let form = {
          client_id: account.client_id,
          client_secret: account.client_secret,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token'
        };
        request.post({
          url: account.refresh_url || oauthDef.tokenUrl,
          headers: account.refresh_headers || {},
          json: true,
          form,
        }, (err, resp, body) => {
          if (err) return callback(err);
          if (resp.statusCode >= 300) return callback(new Error(resp.statusCode));
          account.access_token = body.access_token;
          account.refresh_token = body.refresh_token || account.refresh_token;
          Action.callOAuthRefreshCallbacks(account);
          addParam('header', 'Authorization', "Bearer " + body.access_token);
          callback();
        })
      }
      if (BODY_METHODS.indexOf(method) !== -1) {
        let consumes = op.consumes || ['application/json'];
        let cType = consumes.indexOf('application/json') === -1 ? consumes[0] : 'application/json';
        addParam('header', 'Content-Type', cType);
      }

      addParam('header', 'User-Agent', 'DataFire');

      let sendRequest = (resolve, reject, isRetry) => {
        request(reqOpts, (err, resp, body) => {
          if (err) {
            return reject(err);
          }
          if (body) {
            let encoding = resp.headers['content-encoding'];
            if (encoding === 'gzip') {
              body = zlib.gunzipSync(body, ZLIB_OPTIONS).toString('utf8');
            } else if (encoding === 'deflate') {
              body = zlib.inflateSync(body, ZLIB_OPTIONS).toString('utf8');
            } else {
              body = body.toString('utf8');
            }
          }
          if (!isRetry && resp.statusCode === 401 && hasRefreshToken) {
            refreshOAuthToken(err => {
              if (err) reject(new Response({statusCode: 401}));
              else sendRequest(resolve, reject, true);
            })
            return;
          } else if (resp.statusCode >= 300) {
            return reject(new Response({statusCode: resp.statusCode, body}));
          }
          let ctype = resp.headers['content-type'] || '';
          if (ctype.indexOf('application/json') !== -1) {
            body = JSON.parse(body);
            resolve(body);
          } else if (openapi.info['x-datafire'] && openapi.info['x-datafire'].type === 'rss') {
            rssParser.parseString(body, (err, feed) => {
              if (err) reject(err);
              else resolve(feed);
            })
          } else {
            resolve(body);
          }
        })
      }
      if (modifyReq) modifyReq(reqOpts, ctx);
      return new Promise(sendRequest);
    }
  });
}

const getSchemaFromParam = function(param) {
  if (param.in === 'body' && param.schema) return param.schema;
  let schema = {};
  schema.type = param.type === 'file' ? 'string' : param.type; // FIXME: handle file inputs
  openapiUtil.PARAM_SCHEMA_FIELDS.forEach(f => {
    if (param[f] !== undefined) schema[f] = param[f];
  })
  return schema;
}

const getDefaultResponse = function(op) {
  let keys = Object.keys(op.responses).sort();
  return op.responses[keys[0]];
}

