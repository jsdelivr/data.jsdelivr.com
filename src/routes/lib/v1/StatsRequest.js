const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const FileHits = require('../../../models/FileHits');
const Logs = require('../../../models/Logs');

class StatsRequest extends BaseRequest {
	constructor (ctx) {
		super(ctx);
	}

	async handleNetwork () {
		this.ctx.body = {
			total: await FileHits.getTotal(...this.dateRange),
			meta: await Logs.getStats(...this.dateRange),
		};

		if (!this.ctx.body.meta.records) {
			this.ctx.body.meta.records = 0;
		}

		if (!this.ctx.body.meta.megabytes) {
			this.ctx.body.meta.megabytes = 0;
		}

		this.setCacheHeader();
	}

	async handlePackages () {
		this.ctx.body = await Package.getTopPackages(...this.dateRange, ...this.pagination);
		this.setCacheHeader();
	}
}

module.exports = StatsRequest;
