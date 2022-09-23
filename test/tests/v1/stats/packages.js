const { makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/stats/packages', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsPackagesTests();
});

function makeStatsPackagesTests () {
	makeEndpointSnapshotTests('/v1/stats/packages{?by,type,period}', {
		period: 'month',
	}, [
		{
			by: [ 'hits', 'bandwidth', undefined ],
			type: [ 'gh', 'npm', undefined ],
			period: [ periodOptions, 's-month', 's-year', '2022-04', '2018' ],
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
