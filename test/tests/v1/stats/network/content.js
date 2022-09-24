const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'year', 'all', undefined,
	's-month', 's-year', '2022-05', '2018',
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
