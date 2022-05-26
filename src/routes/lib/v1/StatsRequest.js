const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const PackageHits = require('../../../models/PackageHits');
const ProxyHits = require('../../../models/ProxyHits');
const OtherHits = require('../../../models/OtherHits');
const Logs = require('../../../models/Logs');
const dateRange = require('../../utils/dateRange');
const sumDeep = require('../../utils/sumDeep');
const CountryCdnHits = require('../../../models/CountryCdnHits');

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

	async handleCountries () {
		let [ dailyStats, periodStats ] = await Promise.all([
			CountryCdnHits.getDailyCountryStats(this.query.type, ...this.dateRange),
			CountryCdnHits.getCountryStatsForPeriod(this.period, this.date),
		]);

		this.ctx.body = _.mapValues(dailyStats, (providerStats, country) => {
			// No null checks here because the results should have the same set of providers.
			// If they don't, throwing an error is the best possible action.
			let countryPeriodStats = periodStats[country];

			return {
				total: countryPeriodStats[this.query.type].total,
				providers: providerStats,
				prev: {
					total: countryPeriodStats.prev[this.query.type].total,
				},
			};
		});

		this.setCacheHeader();
	}

	async handleProviders () {
		let [ dailyStats, periodStats ] = await Promise.all([
			CountryCdnHits.getDailyProvidersStatsForLocation(this.query.type, this.locationFilter, ...this.dateRange),
			CountryCdnHits.getProvidersStatsForPeriodAndLocation(this.period, this.locationString, this.date),
		]);

		this.ctx.body = _.mapValues(dailyStats, (providerStats, provider) => {
			// No null checks here because the results should have the same set of providers.
			// If they don't, throwing an error is the best possible action.
			let providerPeriodStats = periodStats[provider];

			return {
				total: providerPeriodStats[this.query.type].total,
				dates: dateRange.fill(providerStats, ...this.dateRange),
				prev: {
					total: providerPeriodStats.prev[this.query.type].total,
				},
			};
		});

		this.setCacheHeader();
	}
}

module.exports = StatsRequest;
