var fillTemplate = require("./conversion/template.js").fillTemplate;
var AWS = require('aws-sdk');
var express = require('express');
var morgan = require('morgan')
var util = require("./util");
var async = require('async');
var AWS = require('aws-sdk');
var config = require("./config");
var getDataFromDb = require("./psql/loans.js").getDataFromDb;
var supportedFormats = require("./conversion/supported-formats.js").supportedFormats;

var s3Bucket = config.s3Bucket;
var awsKey = config.awsKey;
var awsSecret = config.awsSecret;
var awsRegion = config.awsRegion;

AWS.config.update({accessKeyId: awsKey, secretAccessKey: awsSecret, region: awsRegion});

var s3 = new AWS.S3({signatureVersion: 'v4'});

var checkParams = function(params, callback) {
    var err;
    var requiredParams = ['format', 'id'];
    for (var i=0; i < requiredParams.length; i++) {
        if(params[requiredParams[i]] === undefined) {
            err = new Error(requiredParams[i] + ' not specified')
            err.httpCode = 400;
            return callback(err);
        }
    }
    if (!supportedFormats(params.format)) {
        err = new Error('unsupported format');
        err.httpCode = 400;
        return callback(err);
    }
    return callback();
}

var processUrl = function(params, callback) {
    // Goes from url -> (err, buffer, contentType)
    async.waterfall([
        function(callback) {
            checkParams(params, callback);
        },
        function(callback) {
            fillTemplate(params, callback);
        },
    ], function(err, buffer, contentType) {
        callback(err, buffer, contentType);
    });
}

var app = express();

morgan.token('cached', function(req, res) { return res.getHeader('cached'); });
app.use(morgan(":date - [status=:status][method=:method][url=:url][resp_bytes=:res[content-length]][resp_msecs=:response-time][referrer=:referrer][ua=:user-agent][cached=:cached]"));

var numCPUs = require('os').cpus().length;

app.get('/generate', function(req, res) {
    var params = req.query;
    getDataFromDb(params.id, function(err, result) {
        if (err) {
            res.statusCode = 500;
            res.send({"error": err});
        }
        params.data = result
        var safeS3Url = params.pesel + '/' + params.id + '_' + 'test' + '.' + params.format;
        var possibleCacheLoc = { Bucket: s3Bucket, Key: safeS3Url };

        s3.headObject(possibleCacheLoc, function(err, response) {
            if (false) {
                res.setHeader('cached', 'true');
                var size = parseInt(response['ContentLength']);
                var contentType = response['ContentType'];
                res.send({
                    "s3_url": s3.getSignedUrl('getObject', {Bucket: s3Bucket, Key: safeS3Url, Expires: 60*60}),
                    "hitcache": true,
                    "size": size,
                    "mimetype": contentType,
                    "file_name": 'test.' + params.format
                });
            } else {
                res.setHeader('cached', 'false');
                processUrl(params, function(err, imgBuffer, contentType) {
                    if (err) {
                        console.log(err);
                        res.statusCode = (err.httpCode != undefined) ? err.httpCode : 500;
                        res.send({"invalid-convert": err.message});
                    } else {
                        var s3params = {Bucket: s3Bucket, Key: safeS3Url, Body: imgBuffer, ContentType: contentType};
                        s3.putObject(s3params, function(err, data) {
                            if (err) {
                                res.statusCode = 500;
                                res.send({"error-s3-put": err});
                            } else {
                                res.statusCode = 200;
                                res.send({
                                    "s3_url": s3.getSignedUrl('getObject', {Bucket: s3Bucket, Key: safeS3Url, Expires: 60*60}),
                                    "hitcache": false,
                                    "size": imgBuffer.length,
                                    "mimetype": contentType,
                                    "file_name": 'test.' + params.format
                                });
                            }
                        });
                    }
                });
            }
        });
    });
 
});

module.exports = app
