const MAX_EVENTS = 1000;
const logger = require('../util/logger');
const verbose = require('yargs').argv.verbose;

/**
 * Holds details about an HTTP or Task event, including start and end time
 */
class Event {
  constructor(opts={}) {
    Object.assign(this, opts);
  }

  /**
   * Start the event
   */
  start() {
    this.start = new Date();
  }

  /**
   * End the event
   * @param {string|Error} [error] - an error associated with the event
   */
  end(error=null) {
    this.end = new Date();
    this.duration = this.end.getTime() - this.start.getTime();
    this.error = typeof error === 'string' ? new Error(error) : error;
    this.success = !error;
    if (verbose) {
      this.log();
    }
  }

  /**
   * Log basic event details to the console
   */
  log() {
    logger.logInfo(this.type + ": " + (this.id || 'unknown'));
    logger.log("duration: " + this.duration)
    if (this.success) logger.logSuccess();
    else logger.logError((this.error && this.error.message) || undefined);
  }
}

/**
 * Holds on to a fixed number of project events
 */
class Monitor {
  constructor(opts) {
    this.events = {
      http: [],
      task: [],
    }
  }

  /**
   * Starts a new event and adds it to the list
   * @param {string} type - event type (http or task)
   * @param {Object} evt - options for created event
   */
  startEvent(type, evt={}) {
    evt.type = type;
    let event = new Event(evt);
    event.start();
    let events = this.events[event.type];
    if (events.length >= MAX_EVENTS) events.shift();
    events.push(event);
    return event;
  }
}

module.exports = Monitor;
