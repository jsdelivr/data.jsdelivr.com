const BaseRequest = require('./BaseRequest');
const ProxyModel = require('../../../models/Proxy');

class ProxyRequest extends BaseRequest {
	async handleProxyStats () {
		let [ dailyStats, periodStats ] = await Promise.all([
			ProxyModel.getDailyStatsByName(this.params.name, ...this.dateRange),
			ProxyModel.getStatsForPeriod(this.params.name, this.period, this.date),
		]);

		this.ctx.body = this.formatCombinedStats(dailyStats, periodStats);

		this.setCacheHeader();
	}
}

module.exports = ProxyRequest;
