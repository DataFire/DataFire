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

Project.main = function() {
  if (Project.mainProject) return Project.mainProject;
  else return Project.mainProject = Project.fromDirectory(process.cwd());
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
    if (this.actions.indexOf(action) === -1) {
      this.actions.push(action);
    }
    return action;
  }

  for (let authID in this.authorizers) {
    let authorizer = this.authorizers[authID];
    if (!authorizer.action) throw new Error(`No action specified for authorizer ${authID}`);
    authorizer.action = addAction(authorizer.action);
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

      for (let authID in op.authorizers) {
        let authorizer = op.authorizers[authID];
        if (!authorizer) continue;
        if (!authorizer.action) throw new Error(`No action specified for authorizer ${authID} in operation ${method.toUpperCase()} ${path}`);
        authorizer.action = addAction(authorizer.action);
      }
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
