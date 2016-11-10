let datafire = require('../index');

let spec = {
  "info": {
    "title": "MongoDB",
    "description": "Access to MongoDB"
  },
  "securityDefinitions": {
    "mongo_url": {
      "type": "string"
    }
  },
}

class MongoDBOperation extends datafire.Operation {
  constructor(name, integration) {
    super(name, integration);
  }

  call(args, callback) {
    callback(null, 'baz');
  }
}

class MongoDBIntegration extends datafire.Integration {
  constructor() {
    super('mongodb', spec);
    this.addOperation(new MongoDBOperation('get', this))
  }
}

module.exports = MongoDBIntegration;
