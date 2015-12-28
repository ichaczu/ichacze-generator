var formats = ['odt', 'pdf']

var mimetypes = {
    'pdf': 'application/pdf',
    'odt': 'application/vnd.oasis.opendocument.text'
}

var supportedFormats = function(format) {
    return formats.indexOf(format) >= 0;
}

var getMimetype = function(format) {
    return mimetypes[format];
}

module.exports = {
    supportedFormats: supportedFormats,
    getMimetype: getMimetype
}
