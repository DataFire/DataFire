"use strict";

const express = require('express');
const swaggerMiddleware = require('swagger-express-middleware');
const nodepath = require('path');
const fs = require('fs');
const YAML = require('yamljs');
const CronJob = require('cron').CronJob;

const openapiUtil = require('../util/openapi');
const schedule = require('../util/schedule');
const Integration = require('./integration');
const Action = require('./action');
const Response = require('./response');
const Context = require('./context');
const Monitor = require('./monitor');

let Project = module.exports = function(opts) {
  this.id = opts.id || '';
  this.title = opts.title || '';
  this.version = opts.version || '1.0.0';
  this.timezone = opts.timezone || 'America/Los_Angeles';
  this.description = opts.description || '';
  this.paths = opts.paths || {};
  this.tasks = opts.tasks || {};
  this.actions = opts.actions || [];
  this.integrations = opts.integrations || {};
  this.authorizers = opts.authorizers || {};
  this.accounts = opts.accounts || {};
  this.directory = opts.directory || process.cwd();
  this.monitor = new Monitor();

  this.aggregateActions();
  this.initializeOpenAPI(opts.openapi || {});
  this.integration = Integration.fromOpenAPI(this.openapi, this.id);
}

Project.fromDirectory = function(dir) {
  let directory = dir || process.cwd();
  let dfFile = nodepath.join(directory, 'DataFire.yml');
  let acctFile = nodepath.join(directory, 'DataFire-accounts.yml');
  let opts = {};
  if (fs.existsSync(dfFile)) {
    Object.assign(opts, YAML.load(dfFile));
  }
  if (fs.existsSync(acctFile)) {
    Object.assign(opts, YAML.load(acctFile));
  }
  opts.directory = directory;
  return new Project(opts);
}

Project.prototype.aggregateActions = function() {
  let addAction = (action) => {
    if (typeof action === 'string') {
      action = Action.fromName(action, this.directory);
    }
    if (!(action instanceof Action)) {
      action = new Action(action);
    }
    this.actions.push(action);
    return action;
  }

  for (let taskID in this.tasks) {
    let task = this.tasks[taskID];
    if (!task.action) throw new Error(`No action specified for task ${taskID}`);
    task.action = addAction(task.action);
  }
  for (let path in this.paths) {
    for (let method in this.paths[path]) {
      let op = this.paths[path][method];
      if (!op.action) throw new Error(`No action specified for ${method.toUpperCase()} ${path}`);
      op.action = addAction(op.action);
    }
  }
  this.actions.forEach(a => a.project = this);
}

Project.prototype.initializeOpenAPI = function(openapi) {
  this.openapi = Object.assign({
    swagger: '2.0',
    schemes: ['http'],
    host: 'localhost',
    info: {},
    produces: ['application/json'],
    paths: {},
  }, openapi);
  Object.assign(this.openapi.info, {
    title: this.title,
    description: this.description,
    version: this.version,
  }, openapi.info);

  for (let path in this.paths) {
    for (let method in this.paths[path]) {
      let pathOp = this.paths[path][method];
      this.openapi.paths[path] = this.openapi.paths[path] || {};
      let op = this.openapi.paths[path][method] = openapiUtil.getOperation(method, path, pathOp);
      if (pathOp.input !== undefined) op.parameters = [];
    }
  }
  return this.openapi;
}

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

Project.prototype.setup = function(app) {
  for (let path in this.paths) {
    for (let method in this.paths[path]) {
      if (method === 'parameters') continue;
      let op = this.paths[path][method];
      let expressPath = path.replace(openapiUtil.PATH_PARAM_REGEX, ':$1');
      let parameters = this.openapi.paths[path][method].parameters || [];

      app[method](expressPath, (req, res) => {
        let event = this.monitor.startEvent('http', {path, method})
        let respond = (result) => {
          this.monitor.endEvent(event);
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
          request: {
            query: req.query,
            headers: req.headers,
            body: req.body,
            path: req.originalUrl,
            method: req.method,
          }
        });
        op.action.run(input, context)
          .then(result => {
            respond(result);
          }, result => {
            if (!(result instanceof Error || result instanceof Response)) {
              result = new Error(result);
            }
            respond(result);
          })
      });
    }
  }
}

Project.prototype.serve = function(opts) {
  opts = opts || {};
  if (typeof opts === 'number') opts = {port: opts};
  opts.port = opts.port || 3333;
  if (opts.tasks) this.startTasks();

  return new Promise((resolve, reject) => {
    let app = express();
    app.set('json spaces', 2);
    app.use('/openapi.json', (req, res) => res.json(this.openapi));
    let middleware = new swaggerMiddleware.Middleware(app);
    middleware.init(this.openapi, err => {
      if (err) return reject(err);
      app.use(middleware.metadata(), middleware.parseRequest(), middleware.validateRequest());
      app.use((err, req, res, next) => {
        res.status(err.status || 500);
        res.json({error: err.message || "Unknown Error"});
      })
      this.setup(app);
      let server = app.listen(opts.port, function(err) {
        if (err) return reject(err);
        console.log('DataFire listening on port ' + opts.port);
        resolve({server, app});
      })
    })
  });
}

Project.prototype.startTasks = function() {
  for (let taskID in this.tasks) {
    let task = this.tasks[taskID];
    if (!task.schedule) continue;
    let cron = schedule.parse(task.schedule);
    cron = schedule.cronToNodeCron(cron);
    let job = new CronJob(cron, () => {
      let event = this.monitor.startEvent('task', {taskID});
      return task.action.run(task.input, new Context({type: 'task'}))
        .then(data => {
          event.success = true;
          event.output = data;
          this.monitor.endEvent(event);
        }, error => {
          event.success = false;
          event.error = error;
          this.monitor.endEvent(event);
        });
    }, null, true, this.timezone);
  }
}
