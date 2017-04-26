const MAX_EVENTS = 1000;

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
  }
}

module.exports = Monitor;
