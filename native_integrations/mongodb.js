let mongodb = module.exports = {
  "info": {
    "title": "MongoDB",
    "description": "Access to MongoDB"
  },
  "securityDefinitions": {
    "mongo_url": {
      "type": "string"
    }
  },
  operations: {},
}

mongodb.operations.get = (args, callback) => {
  console.log('args', args);
  return callback();
}
