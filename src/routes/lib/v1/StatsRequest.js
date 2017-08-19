const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const FileHits = require('../../../models/FileHits');
const OtherHits = require('../../../models/OtherHits');
const Logs = require('../../../models/Logs');
const sumDeep = require('../../utils/sumDeep');

class StatsRequest extends BaseRequest {
	constructor (ctx) {
		super(ctx);
	}

	async handleNetwork () {
		let fileHits = await FileHits.getSumByDate(...this.dateRange);
		let otherHits = await OtherHits.getSumByDate(...this.dateRange);
		let datesTraffic = await Logs.getMegabytesByDate(...this.dateRange);
		let sumFileHits = sumDeep(fileHits);
		let sumOtherHits = sumDeep(otherHits);

		this.ctx.body = {
			hits: {
				total: sumFileHits + sumOtherHits,
				packages: {
					total: sumFileHits,
					dates: fileHits,
				},
				other: {
					total: sumOtherHits,
					dates: otherHits,
				},
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
