const { makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/stats/packages', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsPackagesTests();
});

function makeStatsPackagesTests () {
	makeEndpointSnapshotTests('/v1/stats/packages{?by,period}', {
		period: 'month',
	}, [
		{
			by: [ 'hits', 'bandwidth', undefined ],
			period: periodOptions,
		},
	]);

	// Legacy version.
	makeEndpointSnapshotTests('/v1/stats/packages{/period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
	]);

	makeEndpointPaginationTests('/v1/stats/packages');
}
