const config = require('config');
const relativeDayUtc = require('relative-day-utc');

const dateRange = require('../../utils/dateRange');
const pagination = require('../../utils/pagination');

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
			this.locationFilter = { countryIso: this.query.country };
			this.locationString = `country:${this.query.country}`;
		} else if (this.query.continent) {
			this.locationFilter = { continentCode: this.query.continent };
			this.locationString = `continent:${this.query.continent}`;
		} else {
			this.locationFilter = {};
			this.locationString = '';
		}

		if (typeof this.query.period === 'object') {
			this.date = this.query.period.date;
			this.period = this.query.period.period;
			this.dateRange = dateRange(this.period, this.date);
		}

		// Enforce use of this.query which contains only validated params.
		ctx.originalQuery = ctx.query;
		ctx.query = {};
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
