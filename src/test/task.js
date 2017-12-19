"use strict";

const datafire = require('../entry');
const expect = require('chai').expect;

describe("Tasks", () => {
  it('should utilize monitor', () => {
    let items = ['A', 'B', 'C'];
    let monitorAction = new datafire.Action({
      handler: input => items,
    });
    let action = new datafire.Action({
      handler: input => input,
    });
    let task = new datafire.Task({
      action: action,
      monitor: {
        action: monitorAction,
      },
      schedule: 'rate(1 day)',
    });
    return task.initializeMonitor()
      .then(allItems => {
        expect(allItems).to.deep.equal(items);
      })
      .then(_ => task.run())
      .then(newItems => {
        expect(newItems.length).to.equal(0);
      })
      .then(_ => {
        items.push('D');
        return task.run();
      })
      .then(newItems => {
        expect(newItems.length).to.equal(1);
        expect(newItems[0]).to.equal('D');
      })
      .then(_ => task.run())
      .then(newItems => {
        expect(newItems.length).to.equal(0);
      });
  })

  it('should allow tracking by nested fields', () => {
    let items = [
      {person: {name: 'A'}},
      {person: {name: 'B'}},
      {person: {name: 'C'}},
    ];
    let monitorAction = new datafire.Action({
      handler: input => {
        return {response: {items}};
      }
    });
    let action = new datafire.Action({
      handler: input => input.person.name,
    })
    let task = new datafire.Task({
      action: action,
      monitor: {
        action: monitorAction,
        array: 'response.items',
        trackBy: 'person.name',
      },
      schedule: 'rate(1 day)',
    });
    return task.initializeMonitor()
      .then(allItems => {
        expect(allItems).to.deep.equal(items);
      })
      .then(_ => task.run())
      .then(newItems => {
        expect(newItems.length).to.equal(0);
      })
      .then(_ => {
        items.push({person: {name: 'D'}});
        return task.run()
      })
      .then(newItems => {
        expect(newItems.length).to.equal(1);
        expect(newItems[0]).to.equal('D');
      })
      .then(_ => task.run())
      .then(newItems => {
        expect(newItems.length).to.equal(0);
      });
  })

  it('should respect maxHistory', () => {
    let items = ['A', 'B', 'C'];
    let monitorAction = new datafire.Action({
      handler: input => items,
    });
    let action = new datafire.Action({
      handler: input => input,
    });
    let task = new datafire.Task({
      action: action,
      monitor: {
        action: monitorAction,
        maxHistory: 3,
      },
      schedule: 'rate(1 day)',
    });
    return task.initializeMonitor()
      .then(allItems => {
        expect(allItems).to.deep.equal(items);
        expect(task.seenItems.length).to.equal(3);
      })
      .then(_ => task.run())
      .then(newItems => {
        expect(newItems.length).to.equal(0);
      })
      .then(_ => {
        items.unshift('D');
        return task.run();
      })
      .then(newItems => {
        expect(newItems.length).to.equal(1);
        expect(newItems[0]).to.equal('D');
        expect(task.seenItems.length).to.equal(3);
      })
      .then(_ => task.run())
      .then(newItems => {
        expect(newItems.length).to.equal(1);
        expect(newItems[0]).to.equal('C');
        expect(task.seenItems.length).to.equal(3);
      });
  });

  it('should use errorHandler', () => {
    let lastError = null;
    let errorHandler = {
      action: new datafire.Action({
        handler: input => lastError = input.error,
      })
    }
    let task = new datafire.Task({
      errorHandler,
      action: new datafire.Action({
        handler: input => {
          throw new Error("test");
        },
      }),
      schedule: 'rate(1 day)',
    })
    return task.run()
      .then(_ => {
        throw new Error("shouldn't reach here")
      }, e => {
        expect(e.message).to.equal('test');
        expect(lastError.message).to.equal('test');
      })
  })
})
