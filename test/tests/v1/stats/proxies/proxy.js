const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all' ];

describe('/v1/stats/proxies/proxy', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeProxyStatsTests();
});

function makeProxyStatsTests () {
	let defaults = {
		period: 'month',
	};

	makeEndpointSnapshotTests('/v1/stats/proxies/{name}{?type,period}', defaults, [
		{ name: 'wp-plugins', type: [ 'hits', 'bandwidth' ], period: periodOptions },
	]);
}
