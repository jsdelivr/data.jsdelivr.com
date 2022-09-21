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
const { splitPackageUserAndName } = require('../utils/link-builder-transforms');
const { routes } = require('../v1');

class StatsRequest extends BaseRequest {
	async handleNetwork () {
		let [ dailyStatsGroups, periodStats ] = await Promise.all([
			CountryCdnHits.getDailyProvidersStatsForLocation(this.simpleLocationFilter, ...this.dateRange),
			CountryCdnHits.getProvidersStatsForPeriodAndLocation(this.period, this.date, this.composedLocationFilter),
		]);

		let combined = _.mapValues(dailyStatsGroups, (dailyStats, provider) => {
			// No null checks here because the results should have the same set of providers.
			// If they don't, throwing an error is the best possible action.
			let providerPeriodStats = periodStats[provider];

			return {
				hits: {
					...providerPeriodStats.hits,
					dates: dateRange.fill(dailyStats.hits, ...this.dateRange, { total: 0, IPv: { 4: 123123, 6: 456456 }, HTTPv: { '1.0': 456789, '1.1': 345678, '2.0': 234567, '3.0': 123456 } }),
					prev: providerPeriodStats.prev.hits,
				},
				bandwidth: {
					...providerPeriodStats.bandwidth,
					dates: dateRange.fill(dailyStats.bandwidth, ...this.dateRange, { total: 0, IPv: { 4: 123123, 6: 456456 }, HTTPv: { '1.0': 456789, '1.1': 345678, '2.0': 234567, '3.0': 123456 } }),
					prev: providerPeriodStats.prev.bandwidth,
				},
			};
		});

		this.ctx.body = this.formatCombinedStatsExtended(combined, 'providers');

		this.setCacheHeader();
	}

	async handleNetworkContent () {
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

		let toDates = (values) => {
			return dateRange.fill(_.mapValues(values, total => ({ total })), ...this.dateRange, { total: 0 });
		};

		this.ctx.body = {
			hits: {
				total: sumFileHits + sumProxyHits + sumOtherHits,
				packages: {
					total: sumFileHits,
					dates: toDates(fileHits),
					prev: { total: sumPrevFileHits },
				},
				proxies: {
					total: sumProxyHits,
					dates: toDates(proxyHits),
					prev: { total: sumPrevProxyHits },
				},
				other: {
					total: sumOtherHits,
					dates: toDates(otherHits),
					prev: { total: sumPrevOtherHits },
				},
				prev: { total: sumPrevFileHits + sumPrevProxyHits + sumPrevOtherHits },
			},
			bandwidth: {
				total: sumFileBandwidth + sumProxyBandwidth + sumOtherBandwidth,
				packages: {
					total: sumFileBandwidth,
					dates: toDates(fileBandwidth),
					prev: { total: sumPrevFileBandwidth },
				},
				proxies: {
					total: sumProxyBandwidth,
					dates: toDates(proxyBandwidth),
					prev: { total: sumPrevProxyBandwidth },
				},
				other: {
					total: sumOtherBandwidth,
					dates: toDates(otherBandwidth),
					prev: { total: sumPrevOtherBandwidth },
				},
				prev: { total: sumPrevFileBandwidth + sumPrevProxyBandwidth + sumPrevOtherBandwidth },
			},
			meta: await Logs.getMetaStats(...this.dateRange),
		};

		if (!this.ctx.body.meta.records) {
			this.ctx.body.meta.records = 0;
		}

		if (!this.ctx.body.meta.recordsBytes) {
			this.ctx.body.meta.recordsBytes = 0;
		}

		this.setCacheHeader();
	}

	async handleNetworkCountries () {
		let [ dailyStats, periodStats ] = await Promise.all([
			CountryCdnHits.getProviderCountryStats(...this.dateRange),
			CountryCdnHits.getCountryStatsForPeriod(this.period, this.date),
		]);

		let combined = _.mapValues(dailyStats, (providerStats, country) => {
			// No null checks here because the results should have the same set of countries.
			// If they don't, throwing an error is the best possible action.
			let countryPeriodStats = periodStats[country];

			return {
				hits: {
					...countryPeriodStats.hits,
					providers: providerStats.hits,
					prev: countryPeriodStats.prev.hits,
				},
				bandwidth: {
					...countryPeriodStats.bandwidth,
					providers: providerStats.bandwidth,
					prev: countryPeriodStats.prev.hits,
				},
			};
		});

		this.ctx.body = this.formatCombinedStatsExtended(combined, 'countries');

		this.setCacheHeader();
	}

	async handlePackages () {
		this.ctx.body = await Package.transform('links', (resources) => {
			return this.linkBuilder()
				.refs({
					self: resource => routes['/stats/packages/:type/:name'].getName(resource),
					versions: resource => routes['/stats/packages/:type/:name/versions'].getName(resource),
				})
				.transform(splitPackageUserAndName)
				.withValues({ by: this.query.by })
				.build(resources);
		}).asRawArray().getTopPackages(this.query.by, this.period, this.date, this.query.type, ...this.pagination);

		this.setCacheHeader();
	}

	async handlePackageStats () {
		let [ dailyStats, periodStats ] = await Promise.all([
			Package.getDailyStatsByName(this.params.type, this.params.name, ...this.dateRange),
			Package.getStatsForPeriod(this.params.type, this.params.name, this.period, this.date),
		]);

		this.ctx.body = this.linkBuilder()
			.refs({
				versions: routes['/stats/packages/:type/:name/versions'].getName(this.params),
			})
			.transform(splitPackageUserAndName)
			.withValues({ ...this.params, by: 'hits' })
			.build(this.formatCombinedStats(dailyStats, periodStats));

		this.setCacheHeader();
	}

	async handlePackageVersionStats () {
		let dailyStats = await PackageVersion.getDailyStatsByNameAndVersion(this.params.type, this.params.name, this.params.version, ...this.dateRange);

		this.ctx.body = this.linkBuilder()
			.refs({
				files: routes['/stats/packages/:type/:name@:version/files'].getName(this.params),
			})
			.transform(splitPackageUserAndName)
			.withValues({ ...this.params, by: 'hits' })
			.build({
				hits: {
					total: sumDeep(dailyStats.hits),
					dates: dateRange.fill(dailyStats.hits, ...this.dateRange),
				},
				bandwidth: {
					total: sumDeep(dailyStats.bandwidth),
					dates: dateRange.fill(dailyStats.bandwidth, ...this.dateRange),
				},
			});

		this.setCacheHeader();
	}

	async handleTopPackageVersions () {
		let stats = await Package.getTopVersions(this.params.type, this.params.name, this.query.by, ...this.dateRange, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				self: routes['/stats/packages/:type/:name@:version'].getName(this.params),
				files: routes['/stats/packages/:type/:name@:version/files'].getName(this.params),
			})
			.transform(splitPackageUserAndName)
			.withValues({ ...this.params, by: this.query.by })
			.build(stats.map((record) => {
				return this.formatDailyStats(record);
			}));

		this.setCacheHeader();
	}

	async handleTopPackageVersionFiles () {
		let stats = await PackageVersion.getTopFiles(this.params.type, this.params.name, this.params.version, this.query.by, ...this.dateRange, ...this.pagination);

		this.ctx.body = stats.map((record) => {
			return {
				...record,
				dates: dateRange.fill(record.dates, ...this.dateRange),
			};
		});

		this.setCacheHeader();
	}

	async handlePeriods () {
		this.ctx.body = this.linkBuilder()
			.includeQuery([ 'period' ])
			.buildRefs({ browsers: routes['/stats/browsers'].getName() }, await Browser.getPeriods())
			.buildRefs({ platforms: routes['/stats/platforms'].getName() }, await Platform.getPeriods())
			.mergeBy('period')
			.sort((a, b) => {
				return a.period > b.period ? -1 : a.period < b.period;
			})
			.sort((a, b) => {
				if (a.period.substr(0, 4) !== b.period.substr(0, 4)) {
					return 0;
				}

				return a.period.length - b.period.length;
			});

		this.setCacheHeader();
	}

	async handleTopPlatforms () {
		let stats = await Platform.getTopPlatforms(this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				browsers: routes['/stats/platforms/:name/browsers'].getName(),
				...!this.query.country && { countries: routes['/stats/platforms/:name/countries'].getName() },
				versions: routes['/stats/platforms/:name/versions'].getName(),
			})
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopPlatformsVersions () {
		let stats = await Platform.getTopPlatformsVersions(this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				...!this.query.country && { countries: routes['/stats/platforms/:name/versions/:version/countries'].getName() },
			})
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopPlatformBrowsers () {
		let stats = await Platform.getTopPlatformBrowsers(this.params.name, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				...!this.query.country && { countries: routes['/stats/browsers/:name/countries'].getName() },
				platforms: routes['/stats/browsers/:name/platforms'].getName(),
				versions: routes['/stats/browsers/:name/versions'].getName(),
			})
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopPlatformCountries () {
		let stats = await Platform.getTopPlatformCountries(this.params.name, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				browsers: routes['/stats/browsers'].getName(),
				platforms: routes['/stats/platforms'].getName(),
			})
			.includeQuery([ 'country' ])
			.omitQuery([ 'continent' ])
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopPlatformVersions () {
		let stats = await Platform.getTopPlatformVersions(this.params.name, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				...!this.query.country && { countries: routes['/stats/platforms/:name/versions/:version/countries'].getName() },
			})
			.withValues({ name: this.params.name })
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopPlatformVersionCountries () {
		let stats = await Platform.getTopPlatformVersionCountries(this.params.name, this.params.version, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				browsers: routes['/stats/browsers'].getName(),
				platforms: routes['/stats/platforms'].getName(),
			})
			.includeQuery([ 'country' ])
			.omitQuery([ 'continent' ])
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopBrowsers () {
		let stats = await Browser.getTopBrowsers(this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				...!this.query.country && { countries: routes['/stats/browsers/:name/countries'].getName() },
				platforms: routes['/stats/browsers/:name/platforms'].getName(),
				versions: routes['/stats/browsers/:name/versions'].getName(),
			})
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopBrowsersVersions () {
		let stats = await Browser.getTopBrowsersVersions(this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				...!this.query.country && { countries: routes['/stats/browsers/:name/versions/:version/countries'].getName() },
			})
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopBrowserCountries () {
		let stats = await Browser.getTopBrowserCountries(this.params.name, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				browsers: routes['/stats/browsers'].getName(),
				platforms: routes['/stats/platforms'].getName(),
			})
			.includeQuery([ 'country' ])
			.omitQuery([ 'continent' ])
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopBrowserPlatforms () {
		let stats = await Browser.getTopBrowserPlatforms(this.params.name, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				browsers: routes['/stats/platforms/:name/browsers'].getName(),
				...!this.query.country && { countries: routes['/stats/platforms/:name/countries'].getName() },
				versions: routes['/stats/platforms/:name/versions'].getName(),
			})
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopBrowserVersions () {
		let stats = await Browser.getTopBrowserVersions(this.params.name, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				...!this.query.country && { countries: routes['/stats/browsers/:name/versions/:version/countries'].getName() },
			})
			.withValues({ name: this.params.name })
			.build(stats);

		this.setCacheHeader();
	}

	async handleTopBrowserVersionCountries () {
		let stats = await Browser.getTopBrowserVersionCountries(this.params.name, this.params.version, this.period, this.date, this.composedLocationFilter, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				browsers: routes['/stats/browsers'].getName(),
				platforms: routes['/stats/platforms'].getName(),
			})
			.includeQuery([ 'country' ])
			.omitQuery([ 'continent' ])
			.build(stats);

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
}

module.exports = StatsRequest;
