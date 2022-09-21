const config = require('config');
const relativeDayUtc = require('relative-day-utc');

const dateRange = require('../utils/dateRange');
const pagination = require('../utils/pagination');
const LinkBuilder = require('../utils/LinkBuilder');

const v1Config = config.get('v1');

class BaseRequest {
	/**
	 * @param {RouterContext} ctx
	 */
	constructor (ctx) {
		this.url = ctx.url;
		this.params = ctx.params;
		this.query = ctx.state.query || {};
		this.ctx = ctx;
		this.pagination = this.params.all ? [ null ] : pagination(this.query.limit, this.query.page);
		ctx.type = 'json';

		if (this.query.country) {
			this.simpleLocationFilter = { countryIso: this.query.country };
			this.composedLocationFilter = { locationType: 'country', locationId: this.query.country };
		} else if (this.query.continent) {
			this.simpleLocationFilter = { continentCode: this.query.continent };
			this.composedLocationFilter = { locationType: 'continent', locationId: this.query.continent };
		} else {
			this.simpleLocationFilter = {};
			this.composedLocationFilter = { locationType: 'global', locationId: '' };
		}

		if (typeof this.query.period === 'object') {
			this.date = this.query.period.date;
			this.period = this.query.period.period;
			this.dateRange = dateRange(this.period, this.date);
			this.prevDateRange = dateRange(this.period, relativeDayUtc(1, this.dateRange[0]));
		}

		// Enforce use of this.query which contains only validated params.
		ctx.originalQuery = ctx.query;
		ctx.query = {};
	}

	deprecate (date, link) {
		this.ctx.set('Deprecation', date.toUTCString());
		this.ctx.append('Link', `<${link}>; rel="successor-version"`);
		return this;
	}

	formatCombinedStats (dailyStats, periodStats) {
		return {
			hits: {
				...periodStats.hits,
				dates: dateRange.fill(dailyStats.hits, ...this.dateRange),
				prev: periodStats.prev.hits,
			},
			bandwidth: {
				...periodStats.bandwidth,
				dates: dateRange.fill(dailyStats.bandwidth, ...this.dateRange),
				prev: periodStats.prev.bandwidth,
			},
		};
	}

	formatCombinedStatsExtended (combined, key) {
		return {
			hits: {
				total: _.reduce(combined, (a, v) => a + v.hits.total, 0),
				[key]: _.mapValues(combined, v => v.hits),
				prev: {
					total: _.reduce(combined, (a, v) => a + v.hits.prev.total, 0),
				},
			},
			bandwidth: {
				total: _.reduce(combined, (a, v) => a + v.bandwidth.total, 0),
				[key]: _.mapValues(combined, v => v.bandwidth),
				prev: {
					total: _.reduce(combined, (a, v) => a + v.bandwidth.prev.total, 0),
				},
			},
		};
	}

	formatDailyStats (dailyStats) {
		return {
			...dailyStats,
			hits: {
				...dailyStats.hits,
				dates: dateRange.fill(dailyStats.hits.dates, ...this.dateRange),
			},
			bandwidth: {
				...dailyStats.bandwidth,
				dates: dateRange.fill(dailyStats.bandwidth.dates, ...this.dateRange),
			},
		};
	}

	linkBuilder () {
		return new LinkBuilder(this.ctx, {
			omitQuery: [ 'limit', 'page' ],
		});
	}

	setCacheHeader (delay = 0) {
		this.ctx.expires = new Date(relativeDayUtc(1).valueOf() + delay).toUTCString();
		this.ctx.maxStale = v1Config.maxStaleShort;
		this.ctx.maxStaleError = v1Config.maxStaleError;
	}

	setCacheHeaderDelayed () {
		this.setCacheHeader(2 * 60 * 60 * 1000);
	}
}

module.exports = BaseRequest;
