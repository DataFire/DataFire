let datafire = require('../index');
let mongodb = require('mongodb');

let QUERY_PARAM = {
  name: 'query',
  description: 'A MongoDB query',
  type: 'object',
}
let PROJECTION_PARAM = {
  name: 'projection',
  description: 'A MongoDB projection',
  type: 'object',
}
let RESULT_RESPONSE = {
  schema: {
    properties: {
      n: {type: 'integer'},
    }
  }
}

let SPEC = {
  info: {
    title: "MongoDB",
    description: "Access to MongoDB"
  },
  securityDefinitions: {
    mongo_url: {
      type: "string",
      name: "url"
    }
  },
  operations: {
    insert: {
      description: "Insert a document",
      parameters: [{
        name: 'document',
        type: 'object',
        description: 'The document to insert',
      }, {
        name: 'documents',
        type: 'array',
        description: 'An array of documents to insert',
      }],
      response: RESULT_RESPONSE,
    },
    find: {
      description: "Retrieve an array of documents",
      parameters: [
        QUERY_PARAM,
        PROJECTION_PARAM,
      ],
      response: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
          }
        }
      }
    },
    findOne: {
      description: "Retrieve a single document",
      parameters: [
        QUERY_PARAM,
        PROJECTION_PARAM,
      ],
      response: {
        schema: {
          type: 'object'
        }
      }
    },
    update: {
      description: "Update a document",
      parameters: [
        QUERY_PARAM,
        {
          name: 'update',
          type: 'object',
          description: 'A MongoDB update object',
        }
      ],
      response: RESULT_RESPONSE,
    },
    remove: {
      description: "Remove a document from the collection",
      parameters: [QUERY_PARAM],
      response: RESULT_RESPONSE,
    }
  }
}

const mongoResultCallback = (cb) => {
  return (err, result) => {
    if (err) return cb(err);
    return cb(null, result.result);
  }
}

class MongoDBOperation extends datafire.Operation {
  constructor(name, collection, integration, run) {
    super(name, integration);
    this.runQuery = run;
    this.collection = collection;
  }

  call(args, callback) {
    if (!this.integration.account) throw new Error("Must supply an account for MongoDB");
    let collection = this.integration.database.collection(this.collection);
    this.runQuery(collection, args, callback);
  }
}

class MongoDBIntegration extends datafire.Integration {
  constructor(mockClient) {
    super('mongodb', SPEC);
    this.client = mockClient || mongodb.MongoClient;
  }

  // Override
  initialize(cb) {
    if (!this.account) return cb();
    this.client.connect(this.account.url, (err, db) => {
      if (err) return cb(err);
      this.database = db;
      cb();
    })
  }

  // Override
  destroy(cb) {
    if (this.database) this.database.close();
    cb();
  }

  find(collection) {
    return new MongoDBOperation('find', collection, this, (collection, args, cb) => {
      collection.find(args.query, args.projection, (err, docs) => {
        if (err) return cb(err);
        docs.toArray(cb);
      });
    });
  }

  findOne(collection) {
    return new MongoDBOperation('findOne', collection, this, (collection, args, cb) => {
      collection.findOne(args.query || {}, args.projection || {}, cb);
    });
  }

  insert(collection) {
    return new MongoDBOperation('insert', collection, this, (collection, args, cb) => {
      collection.insert(args.document || args.documents, mongoResultCallback(cb));
    });
  }

  update(collection) {
    return new MongoDBOperation('update', collection, this, (collection, args, cb) => {
      collection.update(args.query, args.update, (err, data) => {
        if (err) return cb(err);
        cb(null, {n: data.n});
      });
    });
  }

  remove(collection) {
    return new MongoDBOperation('remove', collection, this, (collection, args, cb) => {
      collection.remove(args.query, mongoResultCallback(cb));
    });
  }
}

module.exports = MongoDBIntegration;
