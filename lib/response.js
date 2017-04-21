"use strict";

let Response = module.exports = function(opts) {
  this.statusCode = opts.statusCode || 200;
  this.body = opts.body || '';
  this.headers = opts.headers || {};
}

Response.prototype.send = function(res) {
  res.status(this.statusCode);
  for (let header in this.headers) {
    res.set(header, this.headers[header]);
  }
  res.send(this.body);
  res.end();
}
