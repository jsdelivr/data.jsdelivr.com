const relativeDayUtc = require('relative-day-utc');
const cacheExpirationDate = () => relativeDayUtc(1);

const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const FileHits = require('../../../models/FileHits');
const OtherHits = require('../../../models/OtherHits');
const Logs = require('../../../models/Logs');
const dateRange = require('../../utils/dateRange');
const sumDeep = require('../../utils/sumDeep');

const PromiseLock = require('../../../lib/promise-lock');
const promiseLock = new PromiseLock('st');

class StatsRequest extends BaseRequest {
	async handleNetwork () {
		this.ctx.body = await promiseLock.get(`network:${JSON.stringify(this.dateRange)}`, () => this.handleNetworkInternal(), 5 * 60 * 1000, true);
		this.setCacheHeader();
	}

	async handleNetworkInternal () {
		let fileHits = await FileHits.get(undefined, cacheExpirationDate()).getSumByDate(...this.dateRange);
		let otherHits = await OtherHits.get(undefined, cacheExpirationDate()).getSumByDate(...this.dateRange);
		let datesTraffic = await Logs.get(undefined, cacheExpirationDate()).getMegabytesByDate(...this.dateRange);
		let sumFileHits = sumDeep(fileHits);
		let sumOtherHits = sumDeep(otherHits);

		let result = {
			hits: {
				total: sumFileHits + sumOtherHits,
				packages: {
					total: sumFileHits,
					dates: dateRange.fill(fileHits, ...this.dateRange),
				},
				other: {
					total: sumOtherHits,
					dates: dateRange.fill(otherHits, ...this.dateRange),
				},
			},
			megabytes: {
				total: sumDeep(datesTraffic),
				dates: dateRange.fill(datesTraffic, ...this.dateRange),
			},
			meta: await Logs.get(undefined, cacheExpirationDate()).getMetaStats(...this.dateRange),
		};

		if (!result.meta.records) {
			result.meta.records = 0;
		}

		if (!result.meta.megabytes) {
			result.meta.megabytes = 0;
		}

		return result;
	}

	async handlePackages () {
		this.ctx.body = await promiseLock.get(`packages:${JSON.stringify(this.dateRange)}:${JSON.stringify(this.pagination)}`, () => this.handlePackagesInternal(), 5 * 60 * 1000, true);
		this.setCacheHeader();
	}

	async handlePackagesInternal () {
		return Package.get(undefined, cacheExpirationDate()).getTopPackages(...this.dateRange, ...this.pagination);
	}
}

module.exports = StatsRequest;
