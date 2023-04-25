const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'quarter', 'year', 'all', undefined,
	's-month', 's-quarter', 's-year', '2022-05', '2022-Q2', '2018',
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
