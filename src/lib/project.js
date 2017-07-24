"use strict";

const nodepath = require('path');
const fs = require('fs');
const YAML = require('yamljs');
const CronJob = require('cron').CronJob;

const openapiUtil = require('../util/openapi');
const schedule = require('../util/schedule');
const ProjectServer = require('./project-server');
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
  this.tests = opts.tests || {};
  this.actions = opts.actions || {};
  this.integrations = opts.integrations || {};
  this.authorizers = opts.authorizers || {};
  this.accounts = opts.accounts || {};
  this.directory = opts.directory || process.cwd();
  this.options = opts.options || {};
  this.monitor = new Monitor();

  this.aggregateActions();
  this.initializeOpenAPI(opts.openapi || {});
  this.integration = Integration.fromOpenAPI(this.openapi, this.id);
}

Project.main = function() {
  if (Project.mainProject) return Project.mainProject;
  else return Project.mainProject = Project.fromDirectory(process.cwd());
}

Project.fromDirectory = function(dir) {
  let directory = dir || process.cwd();
  let opts = {};
  function assignFromFile(f) {
    let content = null;
    if (!fs.existsSync(f)) return;
    try {
      content = YAML.load(f);
    } catch (e) {
      console.log('While loading', f);
      throw e;
    }
    Object.assign(opts, content);
  }
  assignFromFile(nodepath.join(directory, 'DataFire.yml'));
  assignFromFile(nodepath.join(directory, 'DataFire-accounts.yml'));
  opts.directory = directory;
  return new Project(opts);
}

Project.prototype.aggregateActions = function() {
  for (let integID in this.integrations) {
    let loc = this.integrations[integID];
    this.integrations[integID] = require(nodepath.join(this.directory, loc));
  }

  for (let actionID in this.actions) {
    this.actions[actionID] = Action.fromName(this.actions[actionID], this.directory, this.integrations);
  }

  let resolveAction = (action) => {
    if (typeof action === 'string') {
      if (this.actions[action]) {
        action = this.actions[action];
      } else {
        action = this.actions[action] = Action.fromName(action, this.directory, this.integrations);
      }
    }
    if (!(action instanceof Action)) {
      action = new Action(action);
    }
    return action;
  }

  for (let authID in this.authorizers) {
    let authorizer = this.authorizers[authID];
    if (!authorizer.action) throw new Error(`No action specified for authorizer ${authID}`);
    authorizer.action = resolveAction(authorizer.action);
  }
  for (let taskID in this.tasks) {
    let task = this.tasks[taskID];
    if (!task.action) throw new Error(`No action specified for task ${taskID}`);
    task.action = resolveAction(task.action);
  }
  for (let path in this.paths) {
    for (let method in this.paths[path]) {
      let op = this.paths[path][method];
      if (!op.action) throw new Error(`No action specified for ${method.toUpperCase()} ${path}`);
      op.action = resolveAction(op.action);

      for (let authID in op.authorizers) {
        let authorizer = op.authorizers[authID];
        if (!authorizer) continue;
        if (!authorizer.action) throw new Error(`No action specified for authorizer ${authID} in operation ${method.toUpperCase()} ${path}`);
        authorizer.action = resolveAction(authorizer.action);
      }
    }
  }
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
      if (pathOp.extendPath) {
        for (let i = 0; i < pathOp.extendPath; ++i) {
          path += '/{' + openapiUtil.EXTENDED_PATH_PARAM_NAME + i + '}';
          this.openapi.paths[path] = this.openapi.paths[path] || {};
          this.openapi.paths[path][method] = openapiUtil.getOperation(method, path, pathOp);
        }
      }
    }
  }
  return this.openapi;
}

Project.prototype.serve = function(opts) {
  opts = opts || {};
  if (typeof opts === 'number') opts = {port: opts};
  opts.port = opts.port || 3333;
  let numTasks = Object.keys(this.tasks).length;
  if (opts.tasks && numTasks) {
    this.startTasks();
    console.log("DataFire running " + numTasks + " task" + (numTasks > 1 ? 's' : ''));
  }
  if (opts.nohttp || !Object.keys(this.paths).length) {
    return Promise.resolve();
  } else {
    return this.startServer(opts.port);
  }
}

Project.prototype.startServer = function(port) {
  this.server = new ProjectServer(this);
  return this.server.start(port).then(_ => {
    console.log('DataFire listening on port ' + port);
  });
}

Project.prototype.startTasks = function() {
  for (let taskID in this.tasks) {
    let task = this.tasks[taskID];
    if (!task.schedule) continue;
    let cron = schedule.parse(task.schedule);
    cron = schedule.cronToNodeCron(cron);
    let job = new CronJob(cron, () => {
      let event = this.monitor.startEvent('task', {id: taskID});
      return task.action.run(task.input, new Context({
        type: 'task',
        accounts: Object.assign({}, this.accounts, task.accounts),
      }))
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
