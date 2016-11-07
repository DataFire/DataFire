var SwaggerParser = require('swagger-parser');
var Request = require('request');
var btoa = require('btoa');
var URL = require('url');

let getBestSecurity = function(securityDefinitions) {
  if (!securityDefinitions) return;
  var ret = null;
  for (var label in securityDefinitions) {
    def = securityDefinitions[label];
    if (def.type === 'oauth2' &&
        (!ret || ret.definition.type !== 'oauth2' || ret.definition.flow === 'accessCode')) {
      ret = {label: label, definition: def}
    } else if ((!ret || ret.definition.type === 'basic') && def.type === 'apiKey') {
      ret = {label: label, definition: def}
    } else if (!ret && def.type === 'basic') {
      ret = {label: label, definition: def}
    }
  }
  return ret;
}

var SwaggerClient = module.exports = function(opts) {
  this.auth = opts.auth || {};
  this.swagger = opts.swagger;
}

SwaggerClient.prototype.initialize = function(callback) {
  var self = this;
  var err = null;
  var catchFn = function(e) {
    err = e;
  }
  SwaggerParser.parse(self.swagger)
    .then(data => SwaggerParser.dereference(data))
    .then(data => {
      for (var path in data.paths) {
        var params = data.paths[path].parameters;
        delete data.paths[path].parameters;
        for (var method in data.paths[path]) {
          var op = data.paths[path][method];
          op.parameters = op.parameters || [];
          if (params) op.parameters = op.parameters.concat(params);
        }
      }
      self.swagger = data;
    })
    .catch(catchFn)
    .then(data => callback(err, self.swagger));
}

SwaggerClient.prototype.authorize = function(auth) {
  this.auth = auth || {};
}

SwaggerClient.prototype.addMiddleware = function(mw) {
  this.middleware = this.middleware || [];
  this.middleware.push(mw);
}

var METHODS = ['get', 'put', 'post', 'patch', 'delete', 'options', 'head'];
METHODS.forEach(function(method) {
  SwaggerClient.prototype[method] = function(path, answers, callback) {
    this.request(method, path, answers, callback);
  }
})
SwaggerClient.prototype.request = function(method, path, answers, callback) {
  var self = this;
  if (!callback) {
    callback = answers;
    answers = {};
  }
  answers = answers || {};
  var swagger = self.swagger;
  var protocol = swagger.schemes.indexOf('https') !== -1 ? 'https' : swagger.schemes[0];
  var basePath = swagger.basePath;
  if (basePath.lastIndexOf('/') === basePath.length - 1) {
    basePath = basePath.substring(0, basePath.length - 1);
  }
  var operation = swagger.paths[path][method];
  var req = {
    url: protocol + '://' + swagger.host + basePath + path,
    method: method,
    headers: {'User-Agent': 'DataFire'},
  }
  var url = URL.parse(req.url, true);
  req.qs = url.query;
  var addParameter = function(param, ans) {
    if (param.in === 'header') {
      req.headers = req.headers || {};
      req.headers[param.name] = ans;
    } else if (param.in === 'query') {
      req.qs = req.qs || {};
      req.qs[param.name] = ans;
    } else if (param.in === 'path' || param.in === 'host') {
      req.url = req.url.replace('{' + param.name + '}', ans);
    } else if (param.in === 'body') {
      if (param.name === 'body') {
        req.body = ans;
        if (typeof ans === 'object') {
          req.body = JSON.stringify(req.body);
          req.headers = req.headers || {};
          req.headers['Content-Type'] = 'application/json';
        }
      } else {
        var data = JSON.parse(req.body || '{}');
        data[param.name] = ans;
        req.body = JSON.stringify(data);
        req.headers = req.headers || {};
        req.headers['Content-Type'] = 'application/json';
      }
    } else if (param.in === 'formData') {
      req.form = req.form || {};
      req.form[param.name] = ans;
    }
  }
  var params = operation.parameters || [];
  params.forEach(function(param) {
    var name = param.in === 'body' ? 'body' : param.name;
    param.name = name;
    var ans = answers[name];
    if (typeof ans === 'undefined' &&
        param.in !== 'path') {
      return;
    }
    if (ans === undefined) ans = '';
    addParameter(param, ans);
  })
  var oauthToken = self.auth.auth_token;
  var addSecurity = function(security) {
    var def = security.definition;
    if (def.type === 'apiKey' || def.type == 'basic' && self.auth[security.label]) {
      var value = self.auth[security.label];
      if (security.label === 'Bearer') value = 'Bearer ' + value;
      else if (def.type === 'basic') value = 'Basic ' + value;
      if (def.type === 'basic') addParameter({in: 'header', name: 'Authorization'}, value);
      else addParameter(def, value);
    } else if (def.type === 'oauth2' && oauthToken) {
      if (def.flow === 'implicit') addParameter({in: 'query', name: def.name || 'access_token'}, oauthToken);
      else if (def.flow === 'oauth1') true; // Ignore, handled below
      else addParameter({in: 'header', name: 'Authorization'}, 'Bearer ' + oauthToken);
      oauthToken = '';
    } else if (def.type === 'basic' && self.auth.username && self.auth.password) {
      addParameter({in: 'header', name: 'Authorization'}, btoa(self.auth.username + ':' + self.auth.password));
    }
  };
  var security = getBestSecurity(swagger.securityDefinitions);
  if (security) {
    if (security.definition.type === 'apiKey') {
      var allKeys = Object.keys(swagger.securityDefinitions).map(function(label) {
        return {label: label, definition: swagger.securityDefinitions[label]};
      }).filter(function(sec) {
        return sec.definition.type === 'apiKey';
      });
      allKeys.forEach(function(k) {
        addSecurity(k);
      })
    } else {
      addSecurity(security);
    }
  }
  if (self.middleware) {
    self.middleware.forEach(function(mw) {req = mw(req)})
  }
  Request(req.url, req, function(err, resp, body) {
    if (err) return callback(err.toString());
    var type = resp.headers['content-type'] || '';
    if (type.indexOf('json') !== -1) body = JSON.parse(body);
    if (resp.statusCode >= 400) return callback({statusCode: resp.statusCode, response: body}, body);
    callback(null, body);
  })
}

