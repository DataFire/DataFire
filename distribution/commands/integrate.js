'use strict';

var fs = require('fs');
var path = require('path');
var proc = require('child_process');
var request = require('request');
var chalk = require('chalk');
var rssParser = require('rss-parser');
var urlParser = require('url');
var YAML = require('yamljs');

var logger = require('../lib/logger');
var datafire = require('../index');

var OPENAPI_SUFFIX = '.openapi.json';
var RSS_SUFFIX = '.rss.json';
var APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
var NATIVE_INTEGRATIONS_DIR = path.join(__dirname, '..', 'native_integrations');
var NATIVE_INTEGRATIONS = fs.readdirSync(NATIVE_INTEGRATIONS_DIR);

var SPEC_FORMATS = ['raml', 'wadl', 'swagger_1', 'api_blueprint', 'io_docs', 'google'];

var RSS_SCHEMA = {
  type: 'object',
  properties: {
    feed: {
      type: 'object',
      properties: {
        link: { type: 'string' },
        title: { type: 'string' },
        feedUrl: { type: 'string' },
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              link: { type: 'string' },
              title: { type: 'string' },
              pubDate: { type: 'string' },
              author: { type: 'string' },
              content: { type: 'string' },
              contentSnippet: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

module.exports = function (args, callback) {
  fs.mkdir(datafire.integrationsDirectory, function (err) {
    var specFormat = SPEC_FORMATS.filter(function (f) {
      return args[f];
    })[0];
    if (args.openapi) {
      integrateURL(args.name, '', args.openapi, false, callback);
    } else if (specFormat) {
      integrateSpec(args.name, specFormat, args[specFormat], callback);
    } else if (args.rss) {
      integrateRSS(args.name, args.rss, callback);
    } else {
      (args.integrations || []).forEach(function (integration) {
        if (getLocalSpec(integration)) return integrateFile(integration);
        request.get(APIS_GURU_URL, { json: true }, function (err, resp, body) {
          if (err) return callback(err);
          var keys = Object.keys(body);
          var validKeys = keys.filter(function (k) {
            return k.indexOf(integration) !== -1;
          });
          if (validKeys.length === 0) return callback(new Error("Integration " + integration + " not found"));
          var exactMatch = validKeys.filter(function (f) {
            return f === integration;
          })[0];
          if (validKeys.length > 1 && !exactMatch) {
            return callback(new Error("Ambiguous API name: " + integration + "\n\nPlease choose one of:\n" + validKeys.join('\n')));
          }
          var info = body[exactMatch || validKeys[0]];
          var url = info.versions[info.preferred].swaggerUrl;
          integrateURL(args.name || integration, validKeys[0], url, true, callback);
        });
      });
    }
  });
};

var addIntegration = function addIntegration(name, type, spec, callback) {
  name = name || getNameFromHost(spec.host);
  var filename = path.join(datafire.integrationsDirectory, name + (type === 'rss' ? RSS_SUFFIX : OPENAPI_SUFFIX));
  logger.log('Writing integration ' + name + ' to ' + filename.replace(process.cwd(), '.'));
  fs.writeFile(filename, JSON.stringify(spec, null, 2), callback);
};

var getLocalSpec = function getLocalSpec(name) {
  return NATIVE_INTEGRATIONS.filter(function (fname) {
    return fname.startsWith(name + '.');
  })[0];
};

var integrateFile = function integrateFile(name, callback) {
  var filename = getLocalSpec(name);
  if (!filename) return callback(new Error("Integration " + name + " not found"));
  fs.readFile(path.join(NATIVE_INTEGRATIONS_DIR, filename), 'utf8', function (err, data) {
    if (err) return callback(err);
    addIntegration(name, 'openapi', JSON.parse(data), callback);
  });
};

var TLDs = ['.com', '.org', '.net', '.gov', '.io', '.co.uk'];
var SUBDOMAINS = ['www.', 'api.', 'developer.'];
var getNameFromHost = function getNameFromHost(host) {
  SUBDOMAINS.forEach(function (sub) {
    if (host.startsWith(sub)) host = host.substring(sub.length);
  });
  TLDs.forEach(function (tld) {
    if (host.endsWith(tld)) host = host.substring(0, host.length - tld.length);
  });
  return host.replace(/\./, '_');
};

var integrateURL = function integrateURL(name, key, url, applyPatches, callback) {
  request.get(url, function (err, resp, body) {
    if (err) return callback(err);
    if (resp.headers['content-type'].indexOf('yaml') !== -1) {
      body = YAML.parse(body);
    } else {
      body = JSON.parse(body);
    }
    if (!body.host) return callback(new Error("Invalid swagger:" + JSON.stringify(body, null, 2)));
    if (applyPatches) maybePatchIntegration(body);
    if (key) body.info['x-datafire-key'] = key;
    addIntegration(name, 'openapi', body, callback);
  });
};

var integrateRSS = function integrateRSS(name, url, callback) {
  var urlObj = urlParser.parse(url);
  if (!name) {
    name = getNameFromHost(urlObj.hostname);
  }
  var spec = {
    swagger: '2.0',
    host: urlObj.hostname,
    basePath: '/',
    schemes: [urlObj.protocol.substring(0, urlObj.protocol.length - 1)],
    paths: {},
    definitions: { Feed: RSS_SCHEMA }
  };
  spec.paths[urlObj.pathname] = {
    get: {
      operationId: 'getItems',
      description: "Retrieve the RSS feed",
      responses: {
        '200': { description: "OK", schema: { $ref: '#/definitions/Feed' } }
      }
    }
  };
  rssParser.parseURL(url, function (err, feed) {
    if (err) return callback(err);
    feed = feed.feed;
    spec.info = {
      title: feed.title,
      description: feed.description
    };
    addIntegration(name, 'rss', spec, callback);
  });
};

var integrateSpec = function integrateSpec(name, format, url, callback) {
  var cmd = 'api-spec-converter "' + url + '" --from ' + format + ' --to swagger_2';
  proc.exec(cmd, function (err, stdout) {
    if (err) {
      logger.logError('Please install api-spec-converter');
      logger.log('npm install -g api-spec-converter');
      return callback(err);
    }
    var filename = path.join(datafire.integrationsDirectory, name + OPENAPI_SUFFIX);
    addIntegration(name, 'openapi', JSON.parse(stdout), callback);
  });
};

var maybePatchIntegration = function maybePatchIntegration(spec) {
  var patch = null;
  try {
    patch = require('../patches/' + spec.host);
  } catch (e) {
    return;
  }
  patch(spec);
};