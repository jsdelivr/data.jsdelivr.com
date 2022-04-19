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
		this.query = ctx.query;
		this.ctx = ctx;
		this.pagination = this.params.all ? [ null ] : pagination(this.query.limit, this.query.page);
		this.period = this.query.period || 'month';
		ctx.type = 'json';

		this.date = relativeDayUtc();
		this.dateRange = dateRange(this.period, this.date);
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
