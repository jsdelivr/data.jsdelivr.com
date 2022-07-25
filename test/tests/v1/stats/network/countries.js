const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

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
