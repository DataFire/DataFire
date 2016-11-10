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
  constructor(name, integration, run) {
    super(name, integration);
    this.run = run;
  }

  call(args, callback) {
    if (!this.integration.account) throw new Error("Must supply an account for MongoDB");
    this.run(args, callback);
  }
}

class MongoDBIntegration extends datafire.Integration {
  constructor(mockClient) {
    super('mongodb', spec);
    this.client = mockClient || mongodb.MongoClient;
    this.addOperation(new MongoDBOperation('get', this, (args, cb) => {
      cb(null, 'baz');
    }))
  }

  initialize(cb) {
    if (!this.account) return cb();
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
