module.exports = class Response {
	constructor (res, resOptions) {
		this.raw = res;
		this.resOptions = resOptions;
		this.body = Buffer.alloc(0);
		this.headers = res.headers;
		this.statusCode = res.statusCode;
	}

	_addChunk (chunk) {
		this.body = Buffer.concat([this.body, chunk])
	}

	json () {
		return this.statusCode === 204 ? null : JSON.parse(this.body)
	}

	text () {
		return this.body.toString()
	}
}