const MAX_EVENTS = 1000;
const logger = require('../util/logger');
const verbose = require('yargs').argv.verbose;

class Monitor {
  constructor(opts) {
    this.events = {
      http: [],
      task: [],
    }
  }

  startEvent(type, evt={}) {
    evt.type = type;
    evt.start = new Date();
    let events = this.events[evt.type];
    if (events.length >= MAX_EVENTS) events.shift();
    events.push(evt);
    return evt;
  }

  endEvent(evt) {
    evt.end = new Date();
    evt.duration = evt.end.getTime() - evt.start.getTime();
    if (verbose) {
      this.log(evt);
    }
  }

  log(event) {
    logger.logInfo(event.type + ": " + (event.id || 'unknown'));
    logger.log("duration: " + event.duration)
    if (event.success) logger.logSuccess();
    else logger.logError();
  }
}

module.exports = Monitor;
