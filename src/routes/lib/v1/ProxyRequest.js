const BaseRequest = require('./BaseRequest');
const ProxyModel = require('../../../models/Proxy');
const dateRange = require('../../utils/dateRange');

class ProxyRequest extends BaseRequest {
	async handleProxyStats () {
		let [ dailyStats, periodStats ] = await Promise.all([
			ProxyModel.getDailyStatsByName(this.params.name, ...this.dateRange),
			ProxyModel.getStatsForPeriod(this.params.name, this.period, this.date),
		]);

		this.ctx.body = {
			...periodStats[this.query.type],
			dates: dateRange.fill(dailyStats[this.query.type], ...this.dateRange),
			prev: periodStats.prev[this.query.type],
		};

		this.setCacheHeader();
	}
}

module.exports = ProxyRequest;
