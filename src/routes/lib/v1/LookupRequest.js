const config = require('config');
const BaseRequest = require('./BaseRequest');
const File = require('../../../models/File');
const v1Config = config.get('v1');

class LookupRequest extends BaseRequest {
	async handleHash () {
		let file = await File.getBySha256(Buffer.from(this.params.hash, 'hex'));

		if (!file) {
			this.ctx.maxAge = 24 * 60 * 60;

			return this.ctx.body = {
				status: 404,
				message: `Couldn't find ${this.params.hash}.`,
			};
		}

		this.ctx.maxAge = v1Config.maxAgeStatic;
		this.ctx.maxStale = v1Config.maxStale;
		this.ctx.body = file;
	}
}

module.exports = LookupRequest;
