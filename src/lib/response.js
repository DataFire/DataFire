"use strict";

let Response = module.exports = function(opts) {
  this._isResponse = true;
  this.statusCode = opts.statusCode || 200;
  this.body = opts.body || '';
  this.encoding = opts.encoding || 'utf8';
  this.headers = opts.headers || {};
  if (opts.json !== undefined) {
    this.headers['Content-Type'] = 'application/json';
    this.body = JSON.stringify(opts.json, null, 2);
  }
}

Response.prototype.send = function(res) {
  res.status(this.statusCode);
  for (let header in this.headers) {
    res.set(header, this.headers[header]);
  }
  res.end(this.body, this.encoding);
}

Response.isResponse = function(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj instanceof Response || obj._isResponse) return true;
  return false;
}
