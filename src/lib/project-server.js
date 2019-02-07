const express = require('express');
const cors = require('cors');
const swaggerMiddleware = require('swagger-express-middleware');
const openapiUtil = require('../util/openapi');
const memCache = require('memory-cache');
const Response = require('./response');
const Context = require('./context');

/**
 * @class
 * Creates an Express server or router for a given DataFire project
 */
class ProjectServer {
  /**
   * @param {Project} project
   */
  constructor(project) {
    this.project = project;
    this.app = express();
  }

  /**
   * Initializes and starts the server
   * @returns {Promise}
   */
  start(port) {
    if (this.close) this.close();
    return this.getRouter().then(r => {
      this.app.use(r);
      return new Promise((resolve, reject) => {
        let server = this.app.listen(port, err => {
          if (err) return reject(err);
          resolve();
        })
        this.close = server.close.bind(server);
      });
    });
  }

  /**
   * Builds an Express Router that can be used in another Express server, e.g.
   * app.use('/api/v1', projectServer.getRouter());
   *
   * @returns {Promise<Router>}
   */
  getRouter() {
    return new Promise((resolve, reject) => {
      let router = express.Router();
      router.use('/openapi.json', (req, res) => {
        res.set("Content-type", "application/json; charset=utf-8");
        res.send(JSON.stringify(this.project.openapi, null, 2));
      });
      let middleware = new swaggerMiddleware.Middleware(this.router);
      middleware.init(this.project.openapi, err => {
        if (err) return reject(err);
        router.use(middleware.metadata());
        if (this.project.options.cors) {
          router.use(middleware.CORS());
        }
        let parserOpts = {
          json: {strict: false, limit: this.project.options.bodyLimit},
        };
        router.use(
            middleware.parseRequest(router, parserOpts),
            middleware.validateRequest()
        );
        router.use((err, req, res, next) => {
          let message = err.message || "Unknown Error";
          let errorPath = message.match(/Data path: "\/([^"]*)"/);
          let paramPath = message.match(/The "([^"]*)" (\w+) parameter is invalid/);
          message = message.split('\n').pop();
          if (errorPath) {
            message = errorPath[1].replace(/\//g, '.') + ': ' + message;
          } else if (paramPath) {
            message = paramPath[1] + ': ' + message;
          }
          res.set("Content-type", "application/json; charset=utf-8");
          const statusCode = err.status || 500;
          res.status(statusCode);
          res.send(JSON.stringify({error: message}, null, 2));
          let event = this.project.monitor.startEvent('http', {
            method: req.method,
            path: req.path,
            id: req.method.toUpperCase() + ' ' + req.path,
            statusCode,
          });
          event.end();
        });
        this.setPaths(router);
        resolve(router);
      })
    });
  }

  /**
   * Internal method to set each path on the router
   */
  setPaths(router) {
    for (let path in this.project.paths) {
      for (let method in this.project.paths[path]) {
        if (method === 'parameters') continue;
        let op = this.project.paths[path][method];
        let allAuthorizers = Object.assign({}, this.project.authorizers || {}, op.authorizers || {});
        let expressPath = path.replace(openapiUtil.PATH_PARAM_REGEX, ':$1');
        let swaggerOp = this.project.openapi.paths[path][method];
        let cacheTime = op.cache || this.project.options.cache;
        if (cacheTime && op.cache !== false) {
          router[method](expressPath, (req, res, next) => {
            req.cacheKey = JSON.stringify({method:req.method, url:req.url, query:req.query, body:req.body, headers:req.headers});
            let cached = memCache.get(req.cacheKey);
            if (cached) {
              res.header(cached.headers);
              res.send(cached.body);
              return;
            }
            let origEnd = res.end.bind(res);
            res.end = (body, encoding) => {
              let toCache = {body, headers:res.header()._headers};
              memCache.put(req.cacheKey, toCache, cacheTime)
              return origEnd(body, encoding);
            }
            next();
          })
        }
        router[method](expressPath, this.requestHandler(method, path, op, swaggerOp, allAuthorizers));
        if (op.extendPath) {
          for (let i = 0; i < op.extendPath; ++i) {
            path += '/{' + openapiUtil.EXTENDED_PATH_PARAM_NAME + i + '}';
            expressPath += '/:' + openapiUtil.EXTENDED_PATH_PARAM_NAME + i;
            swaggerOp = this.project.openapi.paths[path][method];
            router[method](expressPath, this.requestHandler(method, path, op, swaggerOp, allAuthorizers));
          }
        }
      }
    }
  }

  /**
   * Internal method that builds the express middleware to pass to the router.
   */
  requestHandler(method, path, op, swaggerOp, authorizers) {
    let parameters = swaggerOp.parameters || [];
    return (req, res) => {
      const context = this.project.getContext({
        type: 'http',
        accounts: op.accounts,
        request: {
          query: req.query,
          headers: req.headers,
          body: req.body,
          path: req.path,
          pathTemplate: path,
          method: req.method,
        },
      });
      let event = this.project.monitor.startEvent('http', {
        method,
        path,
        context,
        id: method.toUpperCase() + ' ' + path,
        errorHandler: op.errorHandler,
      });
      let respond = (result, success) => {
        let resp = Response.isResponse(result) ? result : Response.default(result);
        event.statusCode = resp.statusCode;
        event.end((success || Response.isResponse(result)) ? null : result);
        resp.send(res);
      }
      let input = op.input;
      if (op.input === undefined) {
        input = {};
        let extendedPathParts = [];
        parameters.forEach(param => {
          if (param.in === 'body') {
            Object.assign(input, req.body, input);
          } else {
            let val = null;
            if (param.in === 'query') val = req.query[param.name];
            else if (param.in === 'header') val = req.get(param.name);
            else if (param.in === 'path') val = req.params[param.name];
            else if (param.in === 'formData') val = req.body[param.name];

            let pathPartMatch = param.name.match(openapiUtil.EXTENDED_PATH_PARAM_REGEX);
            if (param.in === 'path' && pathPartMatch) {
              extendedPathParts[+pathPartMatch[1]] = val;
            } else {
              input[param.name] = val;
            }
          }
        });
        if (extendedPathParts.length) {
          let extendedPath = extendedPathParts.join('/');
          let paramToEdit = null;
          let finalParamMatch = path.match(openapiUtil.EXTENDED_PATH_FINAL_PARAM_REGEX);
          if (finalParamMatch) {
            paramToEdit = parameters.filter(p => p.name === finalParamMatch[1])[0];
            if (!paramToEdit) throw new Error("Parameter " + finalParamMatch[1] + " not found");
            input[paramToEdit.name] += '/' + extendedPath;
          } else {
            input.extendedPath = extendedPath;
          }
        }
      }
      Promise.all(Object.keys(authorizers).map(key => {
        let authorizer = authorizers[key];
        if (authorizer === null || context.accounts[key]) return Promise.resolve();
        return authorizer.action.run(input, context)
          .then(acct => {
            if (Response.isResponse(acct)) throw acct;
            if (acct) context.accounts[key] = acct;
          });
      }))
      .then(_ => op.action.run(input, context))
      .then(result => {
        respond(result, true);
      }, result => {
        if (!(result instanceof Error || Response.isResponse(result))) {
          result = new Error(result);
        }
        respond(result, false);
      })
    }
  }
}

module.exports = ProjectServer;
