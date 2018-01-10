const MAX_EVENTS = 1000;
const Event = require('./event');

/**
 * Holds on to a fixed number of project events
 */
class Monitor {
  constructor(opts={}) {
    this.maxEvents = opts.maxEvents || MAX_EVENTS;
    this.project = opts.project;
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
    evt.project = this.project;
    let event = new Event(evt);
    event.start();
    let events = this.events[event.type];
    if (events.length >= this.maxEvents) events.shift();
    events.push(event);
    return event;
  }
}

module.exports = Monitor;
