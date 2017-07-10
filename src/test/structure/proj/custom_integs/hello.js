'use strict';
let datafire = require('../../../../index');

module.exports = new datafire.Integration({
  title: "hello"
});

module.exports.addAction('sayHi', {handler: input => "Hi!"});
