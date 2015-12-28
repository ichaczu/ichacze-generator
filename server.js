var cluster = require('cluster');
var config = require("./config.js");
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function(worker, code, signal) {
    console.log(new Date().toString() + ' - worker ' + worker.process.pid + ' died with code ' + code + ' -- restarting');
    cluster.fork();
  });
} else {
    var app = require("./app.js");
    app.listen(8000, function() {
        console.info('listening on http://0.0.0.0:8000/');
    });
}
