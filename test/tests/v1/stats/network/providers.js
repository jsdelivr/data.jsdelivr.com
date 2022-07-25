const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/stats/network/providers', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsNetworkProvidersTests();
});

function makeStatsNetworkProvidersTests () {
	makeEndpointSnapshotTests('/v1/stats/network/providers{?continent,country,period}', {
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

	makeEndpointSnapshotTests('/v1/stats/network/providers{?continent,country,period}', {
		period: 'month',
	}, [
		{ continent: 'X' },
		{ country: 'X' },
		{ continent: 'EU', country: 'PL' },
		{ period: 'X' },
	], { status: 400 });
}
