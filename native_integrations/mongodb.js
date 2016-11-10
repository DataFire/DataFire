let datafire = require('../index');
let mongodb = require('mongodb');

let spec = {
  "info": {
    "title": "MongoDB",
    "description": "Access to MongoDB"
  },
  "securityDefinitions": {
    "mongo_url": {
      "type": "string",
      "name": "url"
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
  constructor(mockClient) {
    super('mongodb', spec);
    this.client = mockClient || mongodb.MongoClient;
    this.addOperation(new MongoDBOperation('get', this))
  }

  initialize(cb) {
    if (!this.account) throw new Error("Must specify an account for MongoDB");
    this.client.connect(this.account.url, (err, db) => {
      if (err) return cb(err);
      this.database = db;
      cb();
    })
  }

  destroy(cb) {
    if (this.database) this.database.close();
    cb();
  }
}

module.exports = MongoDBIntegration;
