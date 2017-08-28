let Context = require('./context');

/**
 * @class
 * returned by Integration.create(). Allows the user to set
 * integration account and options once instead of passing
 * a new context each time an action is called
 */
class IntegrationInstance {
  constructor(integration, account) {
    this._integration = integration;

    let accounts = {};
    accounts[integration.id] = account;
    this._context = new Context({accounts});

    let addActions = (fromObj, toObj) => {
      for (let key in fromObj) {
        if (fromObj[key] instanceof Function) {
          toObj[key] = (input, context) => {
            let mergedContext = new Context(context);
            mergedContext.accounts = Object.assign({}, this._context.accounts);
            return fromObj[key](input, mergedContext);
          }
        } else {
          toObj[key] = toObj[key] || {};
          addActions(fromObj[key], toObj[key]);
        }
      }
    }

    addActions(integration.actions, this);
  }
}

module.exports = IntegrationInstance;
