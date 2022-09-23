const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'year', 'all', undefined,
	's-month', 's-year', '2022-04', '2022',
];

describe('/v1/stats/network', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsNetworkProvidersTests();
});

function makeStatsNetworkProvidersTests () {
	makeEndpointSnapshotTests('/v1/stats/network{?continent,country,period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
		{
			continent: 'EU',
			period: periodOptions,
		},
		{
			country: 'PL',
			period: periodOptions,
		},
	]);

	makeEndpointSnapshotTests('/v1/stats/network{?continent,country,period}', {
		period: 'month',
	}, [
		{ continent: 'X' },
		{ country: 'X' },
		{ continent: 'EU', country: 'PL' },
		{ period: 'X' },
	], { status: 400 });
}
