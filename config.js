var cc = require("config-chain")
  , opts = require('optimist').argv
  , path = require("path")

var conf = cc(
    opts,
    path.join(__dirname, 'config.json'),
    {
        awsRegion: "eu-central-1",
    }
);

module.exports = conf.store;
