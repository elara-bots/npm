const Request = require('./src/Request')

module.exports = (url, method) => new Request(url, method)