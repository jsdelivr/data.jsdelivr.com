const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'year', 'all', undefined,
	's-month', 's-year', '2022-05', '2018',
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
		{ period: [ 'X', '2022' ] },
	], { status: 400 });
}
