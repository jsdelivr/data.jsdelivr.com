const BaseRequest = require('./BaseRequest');

const Package = require('../../models/Package');
const CountryCdnHits = require('../../models/CountryCdnHits');
const PackageHits = require('../../models/PackageHits');
const PackageVersion = require('../../models/PackageVersion');
const ProxyModel = require('../../models/Proxy');
const ProxyHits = require('../../models/ProxyHits');
const OtherHits = require('../../models/OtherHits');
const Platform = require('../../models/Platform');
const Browser = require('../../models/Browser');
const Logs = require('../../models/Logs');

const dateRange = require('../utils/dateRange');
const sumDeep = require('../utils/sumDeep');

class StatsRequest extends BaseRequest {
	static platformBrowserStats = {
		'/platforms': (r) => {
			return Platform.getTopPlatforms(r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/platforms/versions': (r) => {
			return Platform.getTopPlatformsVersions(r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/platforms/:name/browsers': (r) => {
			return Platform.getTopPlatformBrowsers(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/platforms/:name/countries': (r) => {
			return Platform.getTopPlatformCountries(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/platforms/:name/versions': (r) => {
			return Platform.getTopPlatformVersions(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/platforms/:name/versions/:version/countries': (r) => {
			return Platform.getTopPlatformVersionCountries(r.params.name, r.params.version, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/browsers': (r) => {
			return Browser.getTopBrowsers(r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/browsers/versions': (r) => {
			return Browser.getTopBrowsersVersions(r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/browsers/:name/countries': (r) => {
			return Browser.getTopBrowserCountries(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/browsers/:name/platforms': (r) => {
			return Browser.getTopBrowserPlatforms(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/browsers/:name/versions': (r) => {
			return Browser.getTopBrowserVersions(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
		'/browsers/:name/versions/:version/countries': (r) => {
			return Browser.getTopBrowserVersionCountries(r.params.name, r.params.version, r.period, r.date, r.composedLocationFilter, ...r.pagination);
		},
	};

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
		this.ctx.body = await Package.getTopPackages(this.query.by, this.period, this.date, undefined, ...this.pagination);
		this.setCacheHeader();
	}

	async handleCountries () {
		let [ dailyStats, periodStats ] = await Promise.all([
			CountryCdnHits.getProviderCountryStats(...this.dateRange),
			CountryCdnHits.getCountryStatsForPeriod(this.period, this.date),
		]);

		this.ctx.body = {
			countries: _.mapValues(dailyStats, (providerStats, country) => {
				// No null checks here because the results should have the same set of providers.
				// If they don't, throwing an error is the best possible action.
				let countryPeriodStats = periodStats[country];

				return {
					hits: {
						total: countryPeriodStats.hits.total,
						providers: providerStats.hits,
						prev: countryPeriodStats.hits.prev,
					},
					bandwidth: {
						total: countryPeriodStats.bandwidth.total,
						providers: providerStats.bandwidth,
						prev: countryPeriodStats.bandwidth.prev,
					},
				};
			}),
		};

		this.setCacheHeader();
	}

	async handlePackageStats () {
		let [ dailyStats, periodStats ] = await Promise.all([
			Package.getDailyStatsByName(this.params.type, this.params.name, ...this.dateRange),
			Package.getStatsForPeriod(this.params.type, this.params.name, this.period, this.date),
		]);

		this.ctx.body = this.formatCombinedStats(dailyStats, periodStats);

		this.setCacheHeader();
	}

	async handlePackageVersionStats () {
		let dailyStats = await PackageVersion.getDailyStatsByNameAndVersion(this.params.type, this.params.name, this.params.version, ...this.dateRange);

		this.ctx.body = {
			hits: {
				total: sumDeep(dailyStats.hits),
				dates: dateRange.fill(dailyStats.hits, ...this.dateRange),
			},
			bandwidth: {
				total: sumDeep(dailyStats.bandwidth),
				dates: dateRange.fill(dailyStats.bandwidth, ...this.dateRange),
			},
		};

		this.setCacheHeader();
	}

	async handleProviders () {
		let [ dailyStats, periodStats ] = await Promise.all([
			CountryCdnHits.getDailyProvidersStatsForLocation(this.simpleLocationFilter, ...this.dateRange),
			CountryCdnHits.getProvidersStatsForPeriodAndLocation(this.period, this.date, this.composedLocationFilter),
		]);

		this.ctx.body = {
			providers: _.mapValues(dailyStats, (providerStats, provider) => {
				// No null checks here because the results should have the same set of providers.
				// If they don't, throwing an error is the best possible action.
				return this.formatCombinedStats(providerStats, periodStats[provider]);
			}),
		};

		this.setCacheHeader();
	}

	async handleProxyStats () {
		let [ dailyStats, periodStats ] = await Promise.all([
			ProxyModel.getDailyStatsByName(this.params.name, ...this.dateRange),
			ProxyModel.getStatsForPeriod(this.params.name, this.period, this.date),
		]);

		this.ctx.body = this.formatCombinedStats(dailyStats, periodStats);

		this.setCacheHeader();
	}

	async handleUsing (handler) {
		this.ctx.body = await handler(this);
		this.setCacheHeader();
	}
}

module.exports = StatsRequest;
