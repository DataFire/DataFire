"use strict";

const CronJob = require('cron').CronJob;

const Context = require('./context');
const Event = require('./event');
const util = require('../util');

const DEFAULT_MAX_HISTORY = 10000;

/**
 * Creates a new Task
 * @class Task
 * @param {Object} opts
 * @param {string} opts.id
 * @param {string} opts.timezone
 * @param {Project} opts.project
 * @param {Action} opts.action
 * @param {Object} opts.monitor
 * @param {Action} opts.monitor.action
 * @param {string} opts.monitor.array - field in the action output where the array is found
 * @param {string} opts.monitor.trackBy - field inside each item to use as an ID
 */
class Task {
  constructor(opts) {
    this.id = opts.id;
    this.action = opts.action;
    this.timezone = opts.timezone;
    this.monitor = opts.monitor;
    this.schedule = opts.schedule;
    this.project = opts.project;
    this.input = opts.input;
    this.accounts = opts.accounts;
    this.errorHandler = opts.errorHandler;
    if (!this.schedule) {
      throw new Error("Task " + this.id + " has no schedule");
    }
    if (!this.action) {
      throw new Error("Task " + this.id + " has no action");
    }
  }

  initializeMonitor() {
    if (!this.monitor) return Promise.resolve();
    this.seenItems = [];
    return this.runMonitor();
  }

  runMonitor() {
    if (!this.monitor) return Promise.resolve();
    let accounts = Object.assign({}, this.accounts || {}, this.monitor.accounts || {});
    let monitorCtx = this.project ? this.project.getContext({accounts}) : new Context({accounts});
    let input = this.monitor.input;
    let maxHistory = this.monitor.maxHistory || DEFAULT_MAX_HISTORY;
    return this.monitor.action.run(this.monitor.input, monitorCtx)
      .then(result => {
        let items = util.followKey(this.monitor.array, result);
        if (!Array.isArray(items)) throw new Error("Monitor for " + this.id + " did not produce an array");
        let newItems = items.reverse().filter(item => {
          let itemID = util.followKey(this.monitor.trackBy, item);
          if (this.seenItems.indexOf(itemID) === -1) {
            this.seenItems.unshift(itemID);
            return true;
          } else {
            return false;
          }
        });
        if (this.seenItems.length > maxHistory) {
          this.seenItems.splice(maxHistory);
        }
        return newItems;
      }, e => {
        let message = "Error initializing monitor for " + this.id;
        if (e.toString) {
          message += ':\n' + e.toString();
        }
        throw new Error(message);
      });
  }

  run() {
    let prom = Promise.resolve();
    let contextOpts = {accounts: this.accounts, type: 'task'};
    let context = this.project
          ? this.project.getContext(contextOpts)
          : new Context(contextOpts);
    let event = {context, id: this.id, errorHandler: this.errorHandler};
    if (this.project) {
      event = this.project.monitor.startEvent('task', event);
    } else {
      event = new Event(event);
      event.start();
    }
    if (this.monitor) {
      prom = prom
          .then(_ => this.runMonitor())
          .then(newItems => Promise.all(newItems.map(item => {
            return this.action.run(item, context);
          })))
    } else {
      prom = prom.then(_ => this.action.run(this.input, context));
    }
    prom = prom.then(output => {
      event.output = output;
      event.end();
      return output;
    }, error => {
      event.end(error);
      throw error;
    });
    return prom;
  }

  start() {
    this.initializeMonitor().then(_ => {
      let schedule = util.schedule.parse(this.schedule);
      let cron = util.schedule.cronToNodeCron(schedule);
      let job = new CronJob(cron, () => this.run(), null, true, this.timezone);
    });
  }
}

module.exports = Task;
