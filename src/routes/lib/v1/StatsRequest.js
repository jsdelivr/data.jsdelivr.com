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
		let [
			{ hits: fileHits, bandwidth: fileBandwidth },
			{ hits: proxyHits, bandwidth: proxyBandwidth },
			{ hits: otherHits, bandwidth: otherBandwidth },
			{ hits: prevFileHits, bandwidth: prevFileBandwidth },
			{ hits: prevProxyHits, bandwidth: prevProxyBandwidth },
			{ hits: prevOtherHits, bandwidth: prevOtherBandwidth },
		] = await Promise.all([
			PackageHits.getSumPerDate(...this.dateRange),
			ProxyHits.getSumPerDate(...this.dateRange),
			OtherHits.getSumPerDate(...this.dateRange),
			PackageHits.getSumPerDate(...this.prevDateRange),
			ProxyHits.getSumPerDate(...this.prevDateRange),
			OtherHits.getSumPerDate(...this.prevDateRange),
		]);

		let sumFileHits = sumDeep(fileHits);
		let sumProxyHits = sumDeep(proxyHits);
		let sumOtherHits = sumDeep(otherHits);
		let sumFileBandwidth = sumDeep(fileBandwidth);
		let sumProxyBandwidth = sumDeep(proxyBandwidth);
		let sumOtherBandwidth = sumDeep(otherBandwidth);

		let sumPrevFileHits = sumDeep(prevFileHits);
		let sumPrevProxyHits = sumDeep(prevProxyHits);
		let sumPrevOtherHits = sumDeep(prevOtherHits);
		let sumPrevFileBandwidth = sumDeep(prevFileBandwidth);
		let sumPrevProxyBandwidth = sumDeep(prevProxyBandwidth);
		let sumPrevOtherBandwidth = sumDeep(prevOtherBandwidth);

		let result = {
			hits: {
				total: sumFileHits + sumProxyHits + sumOtherHits,
				packages: {
					total: sumFileHits,
					dates: dateRange.fill(fileHits, ...this.dateRange),
					prev: { total: sumPrevFileHits },
				},
				proxies: {
					total: sumProxyHits,
					dates: dateRange.fill(proxyHits, ...this.dateRange),
					prev: { total: sumPrevProxyHits },
				},
				other: {
					total: sumOtherHits,
					dates: dateRange.fill(otherHits, ...this.dateRange),
					prev: { total: sumPrevOtherHits },
				},
				prev: { total: sumPrevFileHits + sumPrevProxyHits + sumPrevOtherHits },
			},
			bandwidth: {
				total: sumFileBandwidth + sumProxyBandwidth + sumOtherBandwidth,
				packages: {
					total: sumFileBandwidth,
					dates: dateRange.fill(fileBandwidth, ...this.dateRange),
					prev: { total: sumPrevFileBandwidth },
				},
				proxies: {
					total: sumProxyBandwidth,
					dates: dateRange.fill(proxyBandwidth, ...this.dateRange),
					prev: { total: sumPrevProxyBandwidth },
				},
				other: {
					total: sumOtherBandwidth,
					dates: dateRange.fill(otherBandwidth, ...this.dateRange),
					prev: { total: sumPrevOtherBandwidth },
				},
				prev: { total: sumPrevFileBandwidth + sumPrevProxyBandwidth + sumPrevOtherBandwidth },
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
			CountryCdnHits.getProviderCountryStats(this.query.type, ...this.dateRange),
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
