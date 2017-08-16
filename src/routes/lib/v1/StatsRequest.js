const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const FileHits = require('../../../models/FileHits');
const Logs = require('../../../models/Logs');
const sumDeep = require('../../utils/sumDeep');

class StatsRequest extends BaseRequest {
	constructor (ctx) {
		super(ctx);
	}

	async handleNetwork () {
		let datesHits = await FileHits.getSumByDate(...this.dateRange);
		let datesTraffic = await Logs.getMegabytesByDate(...this.dateRange);

		this.ctx.body = {
			hits: {
				total: sumDeep(datesHits),
				dates: datesHits,
			},
			megabytes: {
				total: sumDeep(datesTraffic),
				dates: datesTraffic,
			},
			meta: await Logs.getMetaStats(...this.dateRange),
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
