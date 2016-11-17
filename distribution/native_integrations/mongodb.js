'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var datafire = require('../index');
var mongodb = require('mongodb');

var QUERY_PARAM = {
  name: 'query',
  description: 'A MongoDB query',
  type: 'object'
};
var PROJECTION_PARAM = {
  name: 'projection',
  description: 'A MongoDB projection',
  type: 'object'
};
var RESULT_RESPONSE = {
  schema: {
    properties: {
      n: { type: 'integer' }
    }
  }
};

var SPEC = {
  info: {
    title: "MongoDB",
    description: "Access to MongoDB"
  },
  securityDefinitions: {
    mongo_url: {
      type: "apiKey",
      name: "mongo_url"
    }
  },
  operations: {
    insert: {
      description: "Insert a document",
      parameters: [{
        name: 'document',
        type: 'object',
        description: 'The document to insert'
      }, {
        name: 'documents',
        type: 'array',
        description: 'An array of documents to insert'
      }],
      response: RESULT_RESPONSE
    },
    find: {
      description: "Retrieve an array of documents",
      parameters: [QUERY_PARAM, PROJECTION_PARAM],
      response: {
        schema: {
          type: 'array',
          items: {
            type: 'object'
          }
        }
      }
    },
    findOne: {
      description: "Retrieve a single document",
      parameters: [QUERY_PARAM, PROJECTION_PARAM],
      response: {
        schema: {
          type: 'object'
        }
      }
    },
    update: {
      description: "Update a document",
      parameters: [QUERY_PARAM, {
        name: 'update',
        type: 'object',
        description: 'A MongoDB update object'
      }],
      response: RESULT_RESPONSE
    },
    remove: {
      description: "Remove a document from the collection",
      parameters: [QUERY_PARAM],
      response: RESULT_RESPONSE
    }
  }
};

var mongoResultCallback = function mongoResultCallback(cb) {
  return function (err, result) {
    if (err) return cb(err);
    return cb(null, result.result);
  };
};

var MongoDBOperation = function (_datafire$Operation) {
  _inherits(MongoDBOperation, _datafire$Operation);

  function MongoDBOperation(name, collection, integration, run) {
    _classCallCheck(this, MongoDBOperation);

    var _this = _possibleConstructorReturn(this, (MongoDBOperation.__proto__ || Object.getPrototypeOf(MongoDBOperation)).call(this, name, integration));

    _this.runQuery = run;
    _this.collection = collection;
    return _this;
  }

  _createClass(MongoDBOperation, [{
    key: 'call',
    value: function call(args, callback) {
      if (!this.integration.account) throw new Error("Must supply an account for MongoDB");
      var collection = this.integration.database.collection(this.collection);
      this.runQuery(collection, args, callback);
    }
  }]);

  return MongoDBOperation;
}(datafire.Operation);

var MongoDBIntegration = function (_datafire$Integration) {
  _inherits(MongoDBIntegration, _datafire$Integration);

  function MongoDBIntegration(mockClient) {
    _classCallCheck(this, MongoDBIntegration);

    var _this2 = _possibleConstructorReturn(this, (MongoDBIntegration.__proto__ || Object.getPrototypeOf(MongoDBIntegration)).call(this, 'mongodb', SPEC));

    _this2.client = mockClient || mongodb.MongoClient;
    return _this2;
  }

  // Override


  _createClass(MongoDBIntegration, [{
    key: 'initialize',
    value: function initialize(cb) {
      var _this3 = this;

      if (!this.account) return cb();
      this.client.connect(this.account.mongo_url, function (err, db) {
        if (err) return cb(err);
        _this3.database = db;
        cb();
      });
    }

    // Override

  }, {
    key: 'destroy',
    value: function destroy(cb) {
      if (this.database) this.database.close();
      cb();
    }
  }, {
    key: 'find',
    value: function find(collection) {
      return new MongoDBOperation('find', collection, this, function (collection, args, cb) {
        collection.find(args.query, args.projection, function (err, docs) {
          if (err) return cb(err);
          docs.toArray(cb);
        });
      });
    }
  }, {
    key: 'findOne',
    value: function findOne(collection) {
      return new MongoDBOperation('findOne', collection, this, function (collection, args, cb) {
        collection.findOne(args.query || {}, args.projection || {}, function (err, item) {
          if (err) return cb(err);
          if (!item) return cb(new Error("Not found"));
          cb(null, item);
        });
      });
    }
  }, {
    key: 'insert',
    value: function insert(collection) {
      return new MongoDBOperation('insert', collection, this, function (collection, args, cb) {
        collection.insert(args.document || args.documents, mongoResultCallback(cb));
      });
    }
  }, {
    key: 'update',
    value: function update(collection) {
      return new MongoDBOperation('update', collection, this, function (collection, args, cb) {
        collection.update(args.query, args.update, function (err, data) {
          if (err) return cb(err);
          cb(null, { n: data.n });
        });
      });
    }
  }, {
    key: 'remove',
    value: function remove(collection) {
      return new MongoDBOperation('remove', collection, this, function (collection, args, cb) {
        collection.remove(args.query, mongoResultCallback(cb));
      });
    }
  }]);

  return MongoDBIntegration;
}(datafire.Integration);

module.exports = MongoDBIntegration;