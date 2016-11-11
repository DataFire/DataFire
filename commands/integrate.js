let fs = require('fs');
let request = require('request');
let chalk = require('chalk');
let rssParser = require('rss-parser');
let urlParser = require('url');

let logger = require('../lib/logger');
let datafire = require('../index');

const OPENAPI_SUFFIX = '.openapi.json';
const RSS_SUFFIX = '.rss.json';
const APIS_GURU_URL = "https://api.apis.guru/v2/list.json";
const NATIVE_INTEGRATIONS_DIR = __dirname + '/../native_integrations';
const NATIVE_INTEGRATIONS = fs.readdirSync(NATIVE_INTEGRATIONS_DIR);

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
  fs.mkdir(datafire.integrationsDirectory, (err) => {
    if (args.openapi) {
      integrateURL(args.name || args.integration, args.openapi);
    } else if (args.rss) {
      integrateRSS(args.name, args.rss);
    } else {
      if (getLocalSpec(args.integration)) return integrateFile(args.integration);
      request.get(APIS_GURU_URL, {json: true}, (err, resp, body) => {
        if (err) throw err;
        let keys = Object.keys(body);
        let validKeys = keys.filter(k => k.indexOf(args.integration) !== -1);
        if (validKeys.length === 0) throw new Error("API " + args.integration + " not found");
        let exactMatch = validKeys.filter(f => f === args.integration)[0];
        if (validKeys.length > 1 && !exactMatch) {
          throw new Error("Ambiguous API name: " + args.integration + "\n\nPlease choose one of:\n" + validKeys.join('\n'));
        }
        let info = body[exactMatch || validKeys[0]];
        let url = info.versions[info.preferred].swaggerUrl;
        integrateURL(args.name || args.integration, url);
      })
    }
  })
}

let getLocalSpec = (name) => {
  return NATIVE_INTEGRATIONS.filter(fname => fname.startsWith(name + '.'))[0];
}

let integrateFile = (name) => {
  let filename = getLocalSpec(name);
  if (!filename) throw new Error("Integration " + name + " not found");
  fs.readFile(NATIVE_INTEGRATIONS_DIR + '/' + filename, 'utf8', (err, data) => {
    if (err) throw err;
    let outFilename = datafire.integrationsDirectory + '/' + filename;
    logger.log('Creating integration ' + outFilename.replace(process.cwd(), '.'));
    fs.writeFileSync(outFilename, data);
  });
}

let integrateURL = (name, url) => {
  request.get(url, {json: true}, (err, resp, body) => {
    if (err) throw err;
    if (!body.host) throw new Error("Invalid swagger:" + JSON.stringify(body, null, 2))
    name = name || body.host;
    let filename = datafire.integrationsDirectory + '/' + name + OPENAPI_SUFFIX;
    logger.log('Creating integration ' + filename.replace(process.cwd(), '.'));
    fs.writeFileSync(filename, JSON.stringify(body, null, 2));
  })
}

let TLDs = ['.com', '.org', '.net', '.gov', '.io', '.co.uk']
let getNameFromHost = (host) => {
  if (host.startsWith('www.')) host = host.substring(4);
  TLDs.forEach(tld => {
    if (host.endsWith(tld)) host = host.substring(0, host.length - tld.length);
  })
  return host.replace(/\./, '_');
}

let integrateRSS = (name, url) => {
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
    if (err) throw err;
    feed = feed.feed;
    spec.info = {
      title: feed.title,
      description: feed.description,
    };
    let filename = datafire.integrationsDirectory + '/' + name + RSS_SUFFIX;
    fs.writeFileSync(filename, JSON.stringify(spec, null, 2));
  })
}
