const fs = require('fs');
const async = require('async');
const path = require('path');
const proc = require('child_process');
const request = require('request');
const chalk = require('chalk');
const rssParser = require('rss-parser');
const urlParser = require('url');
const YAML = require('yamljs');

const openapiUtil = require('../util/openapi');
const logger = require('../util/logger');
const datafire = require('../index');

const SPEC_FORMATS = ['raml', 'wadl', 'swagger_1', 'api_blueprint', 'io_docs', 'google', 'openapi_3'];

const PACKAGE_PREFIX = process.env.DATAFIRE_REGISTRY_DIR ?
  process.env.DATAFIRE_REGISTRY_DIR + '/integrations' : '@datafire'

const RSS_SCHEMA = {
  type: 'object',
  properties: {
    feed: {
      type: 'object',
      properties: {
        link: {type: 'string'},
        title: {type: 'string'},
        feedUrl: {type: 'string'},
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              link: {type: 'string'},
              title: {type: 'string'},
              pubDate: {type: 'string'},
              author: {type: 'string'},
              content: {type: 'string'},
              contentSnippet: {type: 'string'},
            }
          }
        }
      }
    }
  }
}

module.exports = (args) => {
  return new Promise((resolve, reject) => {
    let specFormat = SPEC_FORMATS.filter(f => args[f])[0];
    let directory = args.destination || path.join(process.cwd(), 'integrations');
    let callback = err => {
      if (err) reject(err);
      else resolve(require(path.join(directory, args.name, 'openapi.json')));
    }
    if (args.openapi) {
      integrateOpenAPI(directory, args.name, args.openapi, args.patch, callback);
    } else if (specFormat) {
      integrateSpec(directory, args.name, specFormat, args[specFormat], callback);
    } else if (args.rss) {
      integrateRSS(directory, args.name, args.rss, callback);
    } else {
      throw new Error("Must specify an API specification or RSS feed");
    }
  });
}

const DATAFIRE_LOCATION = process.env.DATAFIRE_LOCATION || 'datafire';
const integrationCode = name => `
"use strict";
let datafire = require('${DATAFIRE_LOCATION}');
let openapi = require('./openapi.json');
module.exports = datafire.Integration.fromOpenAPI(openapi, "${name}");
`.trim();

const addIntegration = (directory, name, type, spec, callback) => {
  name = name || getNameFromHost(spec.host);
  let baseDir = path.join(directory, name);
  let openapiFilename = path.join(baseDir, 'openapi.json');
  let integFilename = path.join(baseDir, 'index.js');
  let detailsFilename = path.join(baseDir, 'details.json');
  spec.info['x-datafire'] = {name, type};
  fs.mkdir(directory, (err) => {
    if (err && err.code !== 'EEXIST') return callback(err);
    fs.mkdir(path.join(directory, name), err => {
      if (err && err.code !== 'EEXIST') return callback(err);
      fs.writeFile(openapiFilename, JSON.stringify(spec, null, 2), e => {
        if (e) return callback(e);
        fs.writeFile(integFilename, integrationCode(name), e => {
          if (e) return callback(e);
          let integ = require(integFilename);
          fs.writeFile(detailsFilename, JSON.stringify(integ.getDetails(true), null, 2), e => {
            if (e) return callback(e);
            logger.log('Created integration ' + name + ' in ' + baseDir.replace(process.cwd(), '.'));
            callback(null, spec);
          })
        });
      });
    })
  })
}

const getLocalSpec = (name) => {
  return NATIVE_INTEGRATIONS.filter(fname => fname.startsWith(name + '.'))[0];
}

const integrateFile = (dir, name, callback) => {
  let filename = getLocalSpec(name);
  let type = filename.indexOf('.rss.') === -1 ? 'openapi' : 'rss';
  if (!filename) return callback(new Error("Integration " + name + " not found"));
  fs.readFile(path.join(NATIVE_INTEGRATIONS_DIR, filename), 'utf8', (err, data) => {
    if (err) return callback(err);
    addIntegration(dir, name, type, JSON.parse(data), callback);
  });
}

const TLDs = ['.com', '.org', '.net', '.gov', '.io', '.co.uk'];
const SUBDOMAINS = ['www.', 'api.', 'developer.'];
const getNameFromHost = (host) => {
  SUBDOMAINS.forEach(sub => {
    if (host.startsWith(sub)) host = host.substring(sub.length);
  })
  TLDs.forEach(tld => {
    if (host.endsWith(tld)) host = host.substring(0, host.length - tld.length);
  })
  return host.replace(/\./, '_');
}

const integrateOpenAPI = (dir, name, url, patch, callback) => {
  function finish(body) {
    if (patch) patch(body);
    for (let path in body.paths) {
      for (let method in body.paths[path]) {
        let op = body.paths[path][method];
        op.operationId = openapiUtil.getOperationId(method, path, op);
      }
    }
    addIntegration(dir, name, 'openapi', body, callback);
  }

  if (fs.existsSync(url)) {
    let content = fs.readFileSync(url);
    if (url.endsWith('.json')) {
      content = JSON.parse(content);
    } else {
      content = YAML.parse(content);
    }
    finish(content);
  } else {
    request.get(url, (err, resp, body) => {
      if (err) return callback(err);
      resp.headers['content-type'] = resp.headers['content-type'] || '';
      if (resp.headers['content-type'].indexOf('yaml') !== -1) {
        body = YAML.parse(body);
      } else {
        body = JSON.parse(body);
      }
      finish(body);
    })
  }
}

const integrateRSS = (dir, name, urls, callback) => {
  if (typeof urls === 'string') {
    urls = {
      getItems: urls,
    }
  }
  let spec = {
    swagger: '2.0',
    basePath: '/',
    paths: {},
    definitions: {Feed: RSS_SCHEMA},
    info: {},
  }
  for (let operation in urls) {
    let url = urls[operation];
    let urlObj = urlParser.parse(url);
    urlObj.pathname = urlObj.pathname.replace(/%7B/g, '{').replace(/%7D/g, '}');
    spec.host = urlObj.hostname;
    spec.schemes = [urlObj.protocol.substring(0, urlObj.protocol.length - 1)];
    if (!name) {
      name = getNameFromHost(urlObj.hostname);
    }
    spec.paths[urlObj.pathname] = {
      get: {
        operationId: operation,
        description: "Retrieve the RSS feed",
        responses: {
          '200': {description: "OK", schema: {$ref: '#/definitions/Feed'}}
        },
        parameters: (urlObj.pathname.match(/\{\w+\}/g) || [])
              .map(p => p.substring(1, p.length - 1))
              .map(p => ({
                name: p,
                in: 'path',
                type: 'string',
                required: true,
              }))
      }
    }
  }
  async.parallel(Object.keys(spec.paths).map(path => {
    let op = spec.paths[path].get;
    return acb => {
      if (op.parameters.length) return acb();
      rssParser.parseURL(spec.schemes[0] + '://' + spec.host + path, (err, feed) => {
        if (err) return acb(err);
        feed = feed.feed;
        spec.paths[path].get.summary = feed.title;
        spec.paths[path].get.description = feed.description;
        acb();
      })
    }
  }), err => {
    if (err) return callback(err);
    let paths = Object.keys(spec.paths);
    if (paths.length === 1) {
      spec.info.title = spec.paths[paths[0]].summary;
      spec.info.description = spec.paths[paths[0]].description;
    }
    addIntegration(dir, name, 'rss', spec, callback);
  })
}

const integrateSpec = (dir, name, format, url, callback) => {
  let cmd = 'api-spec-converter "' + url + '" --from ' + format + ' --to swagger_2';
  proc.exec(cmd, {
    maxBuffer: 1024 * 1024 * 1024, // 1GB
  }, (err, stdout) => {
    if (err) {
      logger.logError('Please install api-spec-converter');
      logger.log('npm install -g api-spec-converter');
      return callback(err);
    }
    addIntegration(dir, name, 'openapi', JSON.parse(stdout), callback);
  })
}

