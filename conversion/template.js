var fs = require('fs');
var ps = require('python-shell');
var config = require('../config.js');
var tmpDir = config.tmpDir;
var convertToPdf = require('./unoconv-doc.js').convert;
var getMimetype = require('./supported-formats.js').getMimetype;

exports.fillTemplate = function(params, callback) {
    var pyshell = new ps('fill_odt.py', {
        mode: 'json'
    });
    var data;
    params.data.filepath = tmpDir + Math.random().toString(36).slice(2) + '.odt';
    pyshell.send(params.data);
    pyshell.on('message', function (message) {
        data = message;
    }).on('close', function () {
        if(data.message === 'ok') {
            if (params.format === 'pdf') {
                convertToPdf(params, 0, function(err, buffer) {
                    callback(err, buffer, getMimetype(params.format));
                });
            } else {
                fs.readFile(params.data.filepath, function(err, buffer) {
                    callback(err, buffer, getMimetype(params.format));
                });
            }
        } else {
            var err = new Error('undefined error')
            err.httpCode = 500;
            callback(err);
        }
    }).end();
};
