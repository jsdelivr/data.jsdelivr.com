const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'year', 'all', undefined,
	's-month', 's-year', '2022-04', '2022',
];

describe('/v1/stats/network/countries', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsNetworkCountriesTests();
});

function makeStatsNetworkCountriesTests () {
	makeEndpointSnapshotTests('/v1/stats/network/countries{?period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
	]);

	makeEndpointSnapshotTests('/v1/stats/network/countries{?period}', {
		period: 'month',
	}, [
		{ period: 'X' },
	], { status: 400 });
}
