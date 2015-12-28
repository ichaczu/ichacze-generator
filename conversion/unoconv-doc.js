var childProcess = require('child_process')
var fs = require('fs');
var isImg = require("./supported-formats.js").isImage;
var config = require("../config.js");
var tmpDir = config.tmpDir;

var convert = function(params, retries, callback) {
    var args = [],
        bin = 'unoconv',
        child,
        stdout = [],
        stderr = [];

    args.push('-f' + params.format);
    args.push('--stdout');
    args.push('--no-launch')
    args.push(params.data.filepath);

    child = childProcess.spawn(bin, args);

    child.stdout.on('data', function (data) {
        stdout.push(data);
    });

    child.stderr.on('data', function (data) {
        stderr.push(data);
    });

    var timer = setTimeout(killSoffice, 15000);
    var past = new Date().getTime();

    child.on('exit', function () {
        clearTimeout(timer);
        if (stderr.length) {
            error = Buffer.concat(stderr).toString()
            if((error.indexOf('Existing listener not found') > 0 || error.indexOf('objects bridged to UNO') > 0 || error.indexOf('Office probably died') > 0) && retries <= 2) {
                if(new Date().getTime() - past > 15000) {
                    return callback(error);
                }
                retries += 1;
                setTimeout(function() {
                    startListener(0, function(err) {
                        if(err) {
                            callback(err);
                        } else {
                            convert(params, retries, callback);
                        }
                    });
                }, 200);
            } else {
                if(error.indexOf('ErrCode 3088') > 0 && error.indexOf('PageRange') > 0) {
                    error = new Error('Invalid page number or range: \'' + pageNo + '\'');
                    error.httpCode = 400;
                } 
                callback(error);
            }
        } else {
            callback(null, Buffer.concat(stdout));
        }
    });
};

var startListener = function (listener_retries, callback) {
    var unoconv = childProcess.exec('pgrep -f \'unoconv --listener\'', function(err, stdout, stderr) {
        if (err || stderr) {
            return callback(err || stderr.toString());
        } else {
            stdout = stdout.toString();
            if(unoconv.pid != parseInt(stdout.replace('\n', ''))) {
                console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' - Unoconv listener started, pid: ' + 
                    parseInt(stdout.replace('\n', '').replace(unoconv.pid, '')) + ', number of retries: ' + (listener_retries - 1));
                return callback(null);
            } else {
                var bin = 'unoconv';
                var args = ['--listener'];
                var listener = childProcess.spawn(bin, args);
                setTimeout(function() {
                    startListener(listener_retries + 1, callback);
                }, 500);
            }
        }
    });
};

var killSoffice = function (callback) {
    var soffice = childProcess.exec('pgrep -f \'soffice.bin\'', function(err, stdout, stderr) {
        if (err || stderr) {
            return callback(err || stderr.toString());
        } else {
            var sofficePids = stdout.toString().split('\n');
            for(var i = 0; i < sofficePids.length - 1; i++) {
                if(soffice.pid != parseInt(sofficePids[i])) {
                    childProcess.exec('sudo kill ' +  sofficePids[i]);
                    console.log(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + ' - Killed soffice pid: ' + sofficePids[i]);
                }
            }
        }
    });
}

module.exports = {
    convert:convert
}
