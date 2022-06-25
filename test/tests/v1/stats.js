const { makeEndpointTests, setupSnapshots } = require('../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/stats', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsPackagesTests();
	makeStatsNetworkTests();
});

function makeStatsPackagesTests () {
	makeEndpointTests('/v1/stats/packages{/type}{/period}{?page,limit}', {
		period: 'month',
	}, [
		{ page: 2 },
		{ page: 2, limit: 10 },
		{
			type: [ 'gh', 'npm', undefined ],
			period: periodOptions,
		},
	]);
}

function makeStatsNetworkTests () {
	makeEndpointTests('/v1/stats/network{/period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
	]);
}
