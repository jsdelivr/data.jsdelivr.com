const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const PackageHits = require('../../../models/PackageHits');
const ProxyHits = require('../../../models/ProxyHits');
const OtherHits = require('../../../models/OtherHits');
const Logs = require('../../../models/Logs');
const dateRange = require('../../utils/dateRange');
const sumDeep = require('../../utils/sumDeep');

class StatsRequest extends BaseRequest {
	async handleNetwork () {
		this.ctx.body = await this.handleNetworkInternal();
		this.setCacheHeader();
	}

	async handleNetworkInternal () {
		let { hits: fileHits, bandwidth: fileBandwidth } = await PackageHits.getSumPerDate(...this.dateRange);
		let { hits: proxyHits, bandwidth: proxyBandwidth } = await ProxyHits.getSumPerDate(...this.dateRange);
		let { hits: otherHits, bandwidth: otherBandwidth } = await OtherHits.getSumPerDate(...this.dateRange);

		let sumFileHits = sumDeep(fileHits);
		let sumProxyHits = sumDeep(proxyHits);
		let sumOtherHits = sumDeep(otherHits);
		let sumFileBandwidth = sumDeep(fileBandwidth);
		let sumProxyBandwidth = sumDeep(proxyBandwidth);
		let sumOtherBandwidth = sumDeep(otherBandwidth);

		let result = {
			hits: {
				total: sumFileHits + sumProxyHits + sumOtherHits,
				packages: {
					total: sumFileHits,
					dates: dateRange.fill(fileHits, ...this.dateRange),
				},
				proxies: {
					total: sumProxyHits,
					dates: dateRange.fill(proxyHits, ...this.dateRange),
				},
				other: {
					total: sumOtherHits,
					dates: dateRange.fill(otherHits, ...this.dateRange),
				},
			},
			bandwidth: {
				total: sumFileBandwidth + sumProxyBandwidth + sumOtherBandwidth,
				packages: {
					total: sumFileBandwidth,
					dates: dateRange.fill(fileBandwidth, ...this.dateRange),
				},
				proxies: {
					total: sumProxyBandwidth,
					dates: dateRange.fill(proxyBandwidth, ...this.dateRange),
				},
				other: {
					total: sumOtherBandwidth,
					dates: dateRange.fill(otherBandwidth, ...this.dateRange),
				},
			},
			meta: await Logs.getMetaStats(...this.dateRange),
		};

		if (!result.meta.records) {
			result.meta.records = 0;
		}

		if (!result.meta.recordsBytes) {
			result.meta.recordsBytes = 0;
		}

		return result;
	}

	async handlePackages () {
		this.ctx.body = await Package.getTopPackages(this.period, this.date, this.params.type, ...this.pagination);
		this.setCacheHeader();
	}

	async handlePackagesInternal (redisCacheExpirationDate) {
		return Package.get(undefined, redisCacheExpirationDate).withLock().asRawArray().getTopPackages(this.period, this.date, this.params.type, ...this.pagination);
	}
}

module.exports = StatsRequest;
