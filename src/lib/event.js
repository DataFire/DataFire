const logger = require('../util/logger');
const verbose = require('yargs').argv.verbose;
const Context = require('./context');

/**
 * Holds details about an HTTP or Task event, including start and end time
 */
class Event {
  constructor(opts={}) {
    Object.assign(this, opts);
    if (this.project && this.errorHandler === undefined) {
      this.errorHandler = this.project.events.error;
    }
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
    if (this.errorHandler) {
      let ctx = this.project ? this.project.getContext({type: 'error'}) : new Context({type: 'error'});
      this.errorHandler.action.run({error: this.error, errorContext: this.context}, ctx);
    }
  }

  /**
   * Log basic event details to the console
   */
  log() {
    logger.logInfo(this.type + ": " + (this.id || 'unknown'));
    logger.log("duration: " + this.duration + 'ms')
    if (this.success) logger.logSuccess();
    else logger.logError((this.error && this.error.message) || undefined);
  }
}

module.exports = Event;
