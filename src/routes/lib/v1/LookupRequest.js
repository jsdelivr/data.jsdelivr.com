const config = require('config');
const BaseRequest = require('./BaseRequest');
const File = require('../../../models/File');
const v1Config = config.get('v1');

class LookupRequest extends BaseRequest {
	constructor (ctx) {
		super(ctx);
	}

	async handleHash () {
		let file = await File.getBySha256(new Buffer(this.params.hash, 'hex'));

		if (!file) {
			return this.ctx.body = {
				status: 404,
				message: `Couldn't find ${this.params.hash}.`,
			};
		}

		this.ctx.maxAge = v1Config.maxAgeStatic;
		this.ctx.body = file;
	}
}

module.exports = LookupRequest;
