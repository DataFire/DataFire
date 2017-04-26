let YAML = require('yamljs');
let path = require('path');
let fs = require('fs');
let datafire = require('../lib');

module.exports = function(args) {
  args.port = args.port || 3000;
  args.directory = args.directory || process.cwd();
  let project = datafire.Project.fromDirectory(args.directory);
  return project.serve(args);
}
