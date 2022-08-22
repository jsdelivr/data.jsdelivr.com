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

class StatsRequest extends BaseRequest {
	static platformBrowserStats = {
		'/platforms': async (r) => {
			let resources = await Platform.getTopPlatforms(r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					browsers: '/stats/platforms/:name/browsers',
					...!r.query.country && { countries: '/stats/platforms/:name/countries' },
					versions: '/stats/platforms/:name/versions',
				})
				.build(resources);
		},
		'/platforms/versions': async (r) => {
			let resources = await Platform.getTopPlatformsVersions(r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					...!r.query.country && { countries: '/stats/platforms/:name/versions/:version/countries' },
				})
				.build(resources);
		},
		'/platforms/:name/browsers': async (r) => {
			let resources = await Platform.getTopPlatformBrowsers(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					...!r.query.country && { countries: '/stats/browsers/:name/countries' },
					platforms: '/stats/browsers/:name/platforms',
					versions: '/stats/browsers/:name/versions',
				})
				.build(resources);
		},
		'/platforms/:name/countries': async (r) => {
			let resources = await Platform.getTopPlatformCountries(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					browsers: '/stats/browsers',
					platforms: '/stats/platforms',
				})
				.includeQuery([ 'country' ])
				.omitQuery([ 'continent' ])
				.build(resources);
		},
		'/platforms/:name/versions': async (r) => {
			let resources = await Platform.getTopPlatformVersions(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					...!r.query.country && { countries: '/stats/platforms/:name/versions/:version/countries' },
				})
				.withValues({ name: r.params.name })
				.build(resources);
		},
		'/platforms/:name/versions/:version/countries': async (r) => {
			let resources = await Platform.getTopPlatformVersionCountries(r.params.name, r.params.version, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					browsers: '/stats/browsers',
					platforms: '/stats/platforms',
				})
				.includeQuery([ 'country' ])
				.omitQuery([ 'continent' ])
				.build(resources);
		},
		'/browsers': async (r) => {
			let resources = await Browser.getTopBrowsers(r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					...!r.query.country && { countries: '/stats/browsers/:name/countries' },
					platforms: '/stats/browsers/:name/platforms',
					versions: '/stats/browsers/:name/versions',
				})
				.build(resources);
		},
		'/browsers/versions': async (r) => {
			let resources = await Browser.getTopBrowsersVersions(r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					...!r.query.country && { countries: '/stats/browsers/:name/versions/:version/countries' },
				})
				.build(resources);
		},
		'/browsers/:name/countries': async (r) => {
			let resources = await Browser.getTopBrowserCountries(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					browsers: '/stats/browsers',
					platforms: '/stats/platforms',
				})
				.includeQuery([ 'country' ])
				.omitQuery([ 'continent' ])
				.build(resources);
		},
		'/browsers/:name/platforms': async (r) => {
			let resources = await Browser.getTopBrowserPlatforms(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					browsers: '/stats/platforms/:name/browsers',
					...!r.query.country && { countries: '/stats/platforms/:name/countries' },
					versions: '/stats/platforms/:name/versions',
				})
				.build(resources);
		},
		'/browsers/:name/versions': async (r) => {
			let resources = await Browser.getTopBrowserVersions(r.params.name, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					...!r.query.country && { countries: '/stats/browsers/:name/versions/:version/countries' },
				})
				.withValues({ name: r.params.name })
				.build(resources);
		},
		'/browsers/:name/versions/:version/countries': async (r) => {
			let resources = await Browser.getTopBrowserVersionCountries(r.params.name, r.params.version, r.period, r.date, r.composedLocationFilter, ...r.pagination);

			return r.linkBuilder()
				.refs({
					browsers: '/stats/browsers',
					platforms: '/stats/platforms',
				})
				.includeQuery([ 'country' ])
				.omitQuery([ 'continent' ])
				.build(resources);
		},
	};

	async handleNetwork () {
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

		this.ctx.body = {
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

		this.ctx.body = {
			countries: _.mapValues(dailyStats, (providerStats, country) => {
				// No null checks here because the results should have the same set of providers.
				// If they don't, throwing an error is the best possible action.
				let countryPeriodStats = periodStats[country];

				return {
					hits: {
						total: countryPeriodStats.hits.total,
						providers: providerStats.hits,
						prev: countryPeriodStats.prev.hits,
					},
					bandwidth: {
						total: countryPeriodStats.bandwidth.total,
						providers: providerStats.bandwidth,
						prev: countryPeriodStats.prev.bandwidth,
					},
				};
			}),
		};

		this.setCacheHeader();
	}

	async handleNetworkProviders () {
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

	async handlePackages () {
		let resources = await Package.getTopPackages(this.query.by, this.period, this.date, undefined, ...this.pagination);

		this.ctx.body = this.linkBuilder()
			.refs({
				self: resource => resource.type === 'npm' ? '/stats/packages/npm/:name' : '/stats/packages/gh/:user/:repo',
				versions: resource => resource.type === 'npm' ? '/stats/packages/npm/:name/versions' : '/stats/packages/gh/:user/:repo/versions',
			})
			.transform(splitPackageUserAndName)
			.withValues({ by: this.query.by })
			.build(resources);

		this.setCacheHeader();
	}

	async handlePackageStats () {
		let [ dailyStats, periodStats ] = await Promise.all([
			Package.getDailyStatsByName(this.params.type, this.params.name, ...this.dateRange),
			Package.getStatsForPeriod(this.params.type, this.params.name, this.period, this.date),
		]);

		this.ctx.body = this.linkBuilder()
			.refs({
				versions: this.params.type === 'npm' ? '/stats/packages/npm/:name/versions' : '/stats/packages/gh/:user/:repo/versions',
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
				files: this.params.type === 'npm' ? '/stats/packages/npm/:name@:version/files' : '/stats/packages/gh/:user/:repo@:version/files',
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
				self: this.params.type === 'npm' ? '/stats/packages/npm/:name@:version' : '/stats/packages/gh/:user/:repo@:version',
				files: this.params.type === 'npm' ? '/stats/packages/npm/:name@:version/files' : '/stats/packages/gh/:user/:repo@:version/files',
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
			.buildRefs({ browsers: '/stats/browsers' }, await Browser.getPeriods())
			.buildRefs({ platforms: '/stats/platforms' }, await Platform.getPeriods())
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
