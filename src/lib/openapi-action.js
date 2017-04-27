let openapiUtil = require('../util/openapi');
let request = require('request');
let Action = require('./action');
let Response = require('./response');
let rssParser = require('rss-parser');

const BODY_METHODS = ['put', 'patch', 'post'];

const getActionFromOperation = module.exports = function(method, path, security, openapi) {
  let op = openapi.paths[path][method];
  let params = op.parameters || [];
  let hasRequiredParam = !!params.filter(p => p.required).length;
  let inputSchema = {
    type: hasRequiredParam ? 'object' : ['object', 'null'],
    properties: {},
    additionalProperties: false,
    definitions: openapi.definitions,
  };
  params.forEach(param => {
    let name = param.in === 'body' ? 'body' : param.name;
    inputSchema.properties[name] = getSchemaFromParam(param);
  });
  let response = getDefaultResponse(op);
  return new Action({
    title: op.operationId || (method.toUpperCase() + ' ' + path),
    description: op.description || op.summary,
    inputSchema: params.length ? inputSchema : {},
    outputSchema: response.schema,
    security,
    handler: function(input, ctx) {
      input = input || {};
      let reqOpts = {
        method,
        url: openapi.schemes[0] + '://' + openapi.host,
        qs: {},
        qsStringifyOptions: {},
        headers: {},
        form: {},
        body: null,
      }
      if (openapi.basePath && openapi.basePath !== '/') reqOpts.url += openapi.basePath;
      reqOpts.url += path;

      let addParam = (loc, name, val) => {
        if (loc === 'query') reqOpts.qs[name] = val;
        else if (loc === 'header') reqOpts.headers[name] = val;
        else if (loc === 'path') reqOpts.url = reqOpts.url.replace('{' + name + '}', val);
        else if (loc === 'formData') reqOpts.form[name] = val;
        else if (loc === 'body') reqOpts.body = JSON.stringify(val);
      }
      params.forEach(param => {
        let val = input[param.name];
        if (param.collectionFormat && Array.isArray(val)) {
          if (param.collectionFormat === 'multi') {
            reqOpts.qsStringifyOptions.arrayFormat = 'repeat';
          } else {
            reqOpts.qsStringifyOptions.sep = getCollectionFormatSeparator(param.collectionFormat);
          }
        }
        addParam(param.in, param.name, val);
      });

      let accountName = Object.keys(security)[0];
      let account = ctx.accounts[accountName];
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
            oauthDef = def;
            addParam('header', 'Authorization', "Bearer " + account.access_token);
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
          url: oauthDef.tokenUrl,
          json: true,
          form,
        }, (err, resp, body) => {
          if (err) return callback(err);
          if (resp.statusCode >= 300) return callback(new Error(resp.statusCode));
          account.access_token = body.access_token;
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
            throw err;
          } else if (!isRetry && resp.statusCode === 401 && hasRefreshToken) {
            refreshOAuthToken(err => {
              if (err) reject(new Response({statusCode: 401}));
              else sendRequest(resolve, reject, true);
            })
            return;
          } else if (resp.statusCode >= 300) {
            return reject(new Response({statusCode: resp.statusCode, body}));
          }
          if (resp.headers['content-type'].indexOf('application/json') !== -1) {  // TODO: more permissive check for JSON
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

      return new Promise(sendRequest);
    }
  });
}

const getSchemaFromParam = function(param) {
  if (param.in === 'body') return param.schema;
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

