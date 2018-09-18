// Note: keep this file compatible with old NodeJS versions (<= 4)
var version = process.version.substring(1);
version = +version.split('.')[0];
module.exports = version;
