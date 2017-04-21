let YAML = require('yamljs');
let path = require('path');
let fs = require('fs');
let datafire = require('../lib');

module.exports = function(args, cb) {
  args.directory = args.directory || '.';
  args.directory = path.resolve(args.directory);
  args.port = args.port || 3000;
  let config = fs.readFileSync(path.join(args.directory, 'DataFire.yml'), 'utf8');
  config = YAML.parse(config);
  config.directory = args.directory;
  let project = new datafire.Project(config);
  project.serve(args).then(df => {
    cb();
  });
}
