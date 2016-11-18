const fs = require('fs');
const path = require('path');
const proc = require('child_process');
const request = require('request');
const chalk = require('chalk');
const rssParser = require('rss-parser');
const urlParser = require('url');
const YAML = require('yamljs');

const logger = require('../lib/logger');
const datafire = require('../index');

const OPENAPI_SUFFIX = '.openapi.json';
const RSS_SUFFIX = '.rss.json';
const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const NATIVE_INTEGRATIONS_DIR = path.join(__dirname, '..', 'native_integrations');
const NATIVE_INTEGRATIONS = fs.readdirSync(NATIVE_INTEGRATIONS_DIR);

const SPEC_FORMATS = ['raml', 'wadl', 'swagger_1', 'api_blueprint', 'io_docs', 'google'];

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

module.exports = (args, callback) => {
  fs.mkdir(datafire.integrationsDirectory, (err) => {
    let specFormat = SPEC_FORMATS.filter(f => args[f])[0];
    if (args.openapi) {
      integrateURL(args.name, '', args.openapi, false, callback);
    } else if (specFormat) {
      integrateSpec(args.name, specFormat, args[specFormat], callback);
    } else if (args.rss) {
      integrateRSS(args.name, args.rss, callback);
    } else {
      (args.integrations || []).forEach(integration => {
        if (getLocalSpec(integration)) return integrateFile(integration);
        request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
          if (err) return callback(err);
          let keys = Object.keys(body);
          let validKeys = keys.filter(k => k.indexOf(integration) !== -1);
          if (validKeys.length === 0) return callback(new Error("Integration " + integration + " not found"));
          let exactMatch = validKeys.filter(f => f === integration)[0];
          if (validKeys.length > 1 && !exactMatch) {
            return callback(new Error("Ambiguous API name: " + integration + "\n\nPlease choose one of:\n" + validKeys.join('\n')));
          }
          let info = body[exactMatch || validKeys[0]];
          let url = info.versions[info.preferred].swaggerUrl;
          integrateURL(args.name || integration, validKeys[0], url, true, callback);
        })
      })
    }
  })
}

const addIntegration = (name, type, spec, callback) => {
  name = name || getNameFromHost(spec.host);
  let filename = path.join(datafire.integrationsDirectory, name + (type === 'rss' ? RSS_SUFFIX : OPENAPI_SUFFIX));
  logger.log('Writing integration ' + name + ' to ' + filename.replace(process.cwd(), '.'));
  fs.writeFile(filename, JSON.stringify(spec, null, 2), callback);
}

const getLocalSpec = (name) => {
  return NATIVE_INTEGRATIONS.filter(fname => fname.startsWith(name + '.'))[0];
}

const integrateFile = (name, callback) => {
  let filename = getLocalSpec(name);
  let type = filename.indexOf('.rss.') === -1 ? 'openapi' : 'rss';
  if (!filename) return callback(new Error("Integration " + name + " not found"));
  fs.readFile(path.join(NATIVE_INTEGRATIONS_DIR, filename), 'utf8', (err, data) => {
    if (err) return callback(err);
    addIntegration(name, type, JSON.parse(data), callback);
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

const integrateURL = (name, key, url, applyPatches, callback) => {
  request.get(url, (err, resp, body) => {
    if (err) return callback(err);
    if (resp.headers['content-type'].indexOf('yaml') !== -1) {
      body = YAML.parse(body);
    } else {
      body = JSON.parse(body);
    }
    if (!body.host) return callback(new Error("Invalid swagger:" + JSON.stringify(body, null, 2)))
    if (applyPatches) maybePatchIntegration(body);
    if (key) body.info['x-datafire-key'] = key;
    addIntegration(name, 'openapi', body, callback);
  })
}

const integrateRSS = (name, url, callback) => {
  let urlObj = urlParser.parse(url);
  if (!name) {
    name = getNameFromHost(urlObj.hostname);
  }
  let spec = {
    swagger: '2.0',
    host: urlObj.hostname,
    basePath: '/',
    schemes: [urlObj.protocol.substring(0, urlObj.protocol.length - 1)],
    paths: {},
    definitions: {Feed: RSS_SCHEMA}
  }
  spec.paths[urlObj.pathname] = {
    get: {
      operationId: 'getItems',
      description: "Retrieve the RSS feed",
      responses: {
        '200': {description: "OK", schema: {$ref: '#/definitions/Feed'}}
      }
    }
  }
  rssParser.parseURL(url, (err, feed) => {
    if (err) return callback(err);
    feed = feed.feed;
    spec.info = {
      title: feed.title,
      description: feed.description,
    };
    addIntegration(name, 'rss', spec, callback);
  })
}

const integrateSpec = (name, format, url, callback) => {
  let cmd = 'api-spec-converter "' + url + '" --from ' + format + ' --to swagger_2';
  proc.exec(cmd, (err, stdout) => {
    if (err) {
      logger.logError('Please install api-spec-converter');
      logger.log('npm install -g api-spec-converter');
      return callback(err);
    }
    let filename = path.join(datafire.integrationsDirectory, name + OPENAPI_SUFFIX);
    addIntegration(name, 'openapi', JSON.parse(stdout), callback);
  })
}

const maybePatchIntegration = (spec) => {
  let patch = null;
  try {
    patch = require('../patches/' + spec.host);
  } catch (e) {
    return;
  }
  patch(spec);
}
