const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'year', 'all', undefined,
	's-month', 's-year', '2022-04', '2018',
];

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

	makeEndpointSnapshotTests('/v1/stats/proxies/{name}{?period}', defaults, [
		{ name: 'wp-plugins', period: periodOptions },
	]);
}
