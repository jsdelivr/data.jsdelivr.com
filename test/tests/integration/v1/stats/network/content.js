const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'quarter', 'year', 'all', undefined,
	's-month', 's-quarter', 's-year', '2022-05', '2022-Q2', '2018',
];

describe('/v1/stats/network', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsNetworkTests();
});

function makeStatsNetworkTests () {
	makeEndpointSnapshotTests('/v1/stats/network/content{?period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
	]);
}
