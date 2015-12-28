var crypto = require('crypto');

exports.getConvertIdentity = function(query) {
    return crypto.createHash('md5').update(query.data).digest("hex");
};

exports.queryDataToObject = function(query) {
    return JSON.parse(new Buffer(query.data, 'base64').toString())
}
