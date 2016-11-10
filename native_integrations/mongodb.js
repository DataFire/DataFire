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
  "operations": {
    "insert": {}
  }
}

class MongoDBOperation extends datafire.Operation {
  constructor(name, integration, run) {
    super(name, integration);
    this.runQuery = run;
    this.info.parameters = [{
      name: 'collection',
      type: 'string',
      description: 'The MongoDB collection to operate on',
      required: true,
    }];
    if (this.name === 'insert') {
      this.info.parameters.push({
        name: 'document',
        type: 'object',
        description: 'The document to insert',
      })
      this.info.response = {
        schema: {
          properties: {
            ok: {type: 'integer'},
            n: {type: 'integer'},
          }
        }
      }
    }
  }

  call(args, callback) {
    if (!this.integration.account) throw new Error("Must supply an account for MongoDB");
    let collection = this.integration.database.collection(args.collection);
    this.runQuery(collection, args, (err, result) => {
      if (err) return callback(err);
      return callback(null, result.result);
    });
  }
}

class MongoDBIntegration extends datafire.Integration {
  constructor(mockClient) {
    super('mongodb', spec);
    this.client = mockClient || mongodb.MongoClient;
    this.addOperation(new MongoDBOperation('insert', this, (collection, args, cb) => {
      collection.insert(args.document || args.documents, cb);
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
