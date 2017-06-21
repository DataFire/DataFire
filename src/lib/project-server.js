const express = require('express');
const cors = require('cors');
const swaggerMiddleware = require('swagger-express-middleware');
const openapiUtil = require('../util/openapi');
const Response = require('./response');
const Context = require('./context');

function defaultResponse(body) {
  let statusCode = 200;
  if (body instanceof Error) {
    statusCode = body.statusCode || 500;
    body = {error: body.message};
  }
  return new Response({
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body, null, 2),
  })
}

class ProjectServer {
  constructor(project) {
    this.project = project;
    this.app = express();
  }

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
        router.use(middleware.parseRequest(router, {json: {strict: false}}), middleware.validateRequest());
        router.use((err, req, res, next) => {
          res.set("Content-type", "application/json; charset=utf-8");
          res.status(err.status || 500);
          res.send(JSON.stringify({error: err.message || "Unknown Error"}, null, 2));
        })
        this.setPaths(router);
        resolve(router);
      })
    });
  }

  setPaths(router) {
    for (let path in this.project.paths) {
      for (let method in this.project.paths[path]) {
        if (method === 'parameters') continue;
        let op = this.project.paths[path][method];
        let allAuthorizers = Object.assign({}, this.project.authorizers || {}, op.authorizers || {});
        let expressPath = path.replace(openapiUtil.PATH_PARAM_REGEX, ':$1');
        let parameters = this.project.openapi.paths[path][method].parameters || [];
        router[method](expressPath, this.requestHandler(method, path, op, parameters, allAuthorizers));
      }
    }
  }

  requestHandler(method, path, op, parameters, authorizers) {
    return (req, res) => {
      let event = this.project.monitor.startEvent('http', {
        path, method,
        id: method.toUpperCase() + ' ' + path,
      })
      let respond = (result, success) => {
        event.success = success;
        this.project.monitor.endEvent(event);
        if (!(result instanceof Response)) {
          result = defaultResponse(result);
        }
        result.send(res);
      }
      let input = op.input;
      if (op.input === undefined) {
        input = {};
        parameters.forEach(param => {
          if (param.in === 'body') {
            Object.assign(input, req.body, input);
          } else {
            let val = null;
            if (param.in === 'query') val = req.query[param.name];
            else if (param.in === 'header') val = req.get(param.name);
            else if (param.in === 'path') val = req.params[param.name];
            else if (param.in === 'formData') val = req.body[param.name];
            input[param.name] = val;
          }
        });
      }
      const context = new Context({
        type: 'http',
        accounts: Object.assign({}, this.project.accounts, op.accounts),
        request: {
          query: req.query,
          headers: req.headers,
          body: req.body,
          path: req.path,
          method: req.method,
        },
      });
      Promise.all(Object.keys(authorizers).map(key => {
        let authorizer = authorizers[key];
        if (authorizer === null || context.accounts[key]) return Promise.resolve();
        return authorizer.action.run(input, context)
          .then(acct => {
            if (acct instanceof Response) throw acct;
            if (acct) context.accounts[key] = acct;
          });
      }))
      .then(_ => op.action.run(input, context))
      .then(result => {
        respond(result, true);
      }, result => {
        if (!(result instanceof Error || result instanceof Response)) {
          result = new Error(result);
        }
        respond(result, false);
      })
    }
  }
}

module.exports = ProjectServer;
