const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/stats/network', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsNetworkTests();
});

function makeStatsNetworkTests () {
	makeEndpointSnapshotTests('/v1/stats/network{?period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
	]);

	// Legacy version.
	makeEndpointSnapshotTests('/v1/stats/network{/period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
	]);
}
