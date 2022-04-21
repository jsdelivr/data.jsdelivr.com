const { makeEndpointTests, setupSnapshots } = require('../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/proxy/stats', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeProxyStatsTests();
});

function makeProxyStatsTests () {
	let defaults = {
		period: 'month',
	};

	makeEndpointTests('/v1/proxy/{name}/stats{?period}', defaults, [
		{ name: 'wp-plugins', period: periodOptions },
	]);
}
