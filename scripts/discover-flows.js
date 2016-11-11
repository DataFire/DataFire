const fs = require('fs');
const Flow = require('../index').Flow;
const async = require('async');
const logger = require('../lib/logger');

let discover = module.exports = function(dir, callback) {
  console.log(dir);
  let flows = [];
  fs.readdir(dir, (err, files) => {
    if (err) return callback(err);
    jsFiles = files.filter(f => f.endsWith('.js'));
    directories = files.filter(f => fs.lstatSync(dir + '/' + f).isDirectory());
    jsFiles.forEach(f => {
      let result = require(dir + '/' + f);
      if (result instanceof Flow) {
        flows.push({
          flow: result,
          file: dir + '/' + f,
        })
      }
    });
    directories = files.filter(f => fs.lstatSync(dir + '/' + f).isDirectory());
    async.series(directories.map(d => {
      return cb => {
        discover(dir + '/' + d, (err, newFlows) => {
          if (err) return cb(err);
          flows = flows.concat(newFlows);
          cb(null);
        });
      }
    }), err => {
      callback(err, flows);
    })
  })
}

discover(process.cwd(), (err, flows) => {
  if (err) throw err;
  console.log("Found " + flows.length + " flows");
  flows.map(f => f.flow).forEach(logger.logFlow)
});
