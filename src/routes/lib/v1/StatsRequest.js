const relativeDayUtc = require('relative-day-utc');

const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const PackageHits = require('../../../models/PackageHits');
const OtherHits = require('../../../models/OtherHits');
const Logs = require('../../../models/Logs');
const dateRange = require('../../utils/dateRange');
const sumDeep = require('../../utils/sumDeep');

const PromiseLock = require('../../../lib/promise-lock');
const promiseLock = new PromiseLock('st');

class StatsRequest extends BaseRequest {
	async handleNetwork () {
		this.ctx.body = await promiseLock.get(`network:${JSON.stringify(this.dateRange)}`, () => this.handleNetworkInternal(relativeDayUtc(1)), undefined, true);
		this.setCacheHeader();
	}

	async handleNetworkInternal (redisCacheExpirationDate) {
		let fileHits = await PackageHits.get(undefined, redisCacheExpirationDate).getSumPerDate(...this.dateRange);
		let otherHits = await OtherHits.get(undefined, redisCacheExpirationDate).getSumPerDate(...this.dateRange);
		let datesTraffic = await Logs.get(undefined, redisCacheExpirationDate).getMegabytesPerDate(...this.dateRange);
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
			meta: await Logs.get(undefined, redisCacheExpirationDate).getMetaStats(...this.dateRange),
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
		this.ctx.body = await promiseLock.get(`packages:${JSON.stringify(this.dateRange)}:${JSON.stringify(this.pagination)}`, () => this.handlePackagesInternal(relativeDayUtc(1)), undefined, true);
		this.setCacheHeader();
	}

	async handlePackagesInternal (redisCacheExpirationDate) {
		return Package.get(undefined, redisCacheExpirationDate).getTopPackages(...this.dateRange, ...this.pagination);
	}
}

module.exports = StatsRequest;
