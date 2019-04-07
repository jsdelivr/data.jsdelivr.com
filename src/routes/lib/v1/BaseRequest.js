const config = require('config');
const relativeDayUtc = require('relative-day-utc');

const dateRange = require('../../utils/dateRange');
const pagination = require('../../utils/pagination');

const v1Config = config.get('v1');

class BaseRequest {
	constructor (ctx) {
		this.url = ctx.url;
		this.params = ctx.params;
		this.query = ctx.query;
		this.ctx = ctx;
		this.dateRange = dateRange(this.query.from, this.query.to);
		this.pagination = this.params.all ? [ null ] : pagination(this.query.limit, this.query.page);
		ctx.type = 'json';
	}

	setCacheHeader (delay = 0) {
		if (this.dateRange.isStatic) {
			this.ctx.maxAge = v1Config.maxAgeStatic;
		} else {
			this.ctx.expires = new Date(relativeDayUtc(1).valueOf() + delay).toUTCString();
		}

		this.ctx.maxStale = v1Config.maxStaleStatic;
	}

	setCacheHeaderDelayed () {
		this.setCacheHeader(2 * 60 * 60 * 1000);
	}
}

module.exports = BaseRequest;
