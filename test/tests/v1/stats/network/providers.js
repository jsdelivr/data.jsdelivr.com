const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all' ];

describe('/v1/stats/network/providers', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsNetworkProvidersTests();
});

function makeStatsNetworkProvidersTests () {
	makeEndpointSnapshotTests('/v1/stats/network/providers{?continent,country,type,period}', {
		period: 'month',
	}, [
		{
			type: [ 'hits', 'bandwidth' ],
			period: periodOptions,
		},
		{
			continent: 'EU',
			type: [ 'hits', 'bandwidth' ],
			period: periodOptions,
		},
		{
			country: 'PL',
			type: [ 'hits', 'bandwidth' ],
			period: periodOptions,
		},
	]);

	makeEndpointSnapshotTests('/v1/stats/network/providers{?continent,country,type,period}', {
		period: 'month',
	}, [
		{ continent: 'X', type: 'hits' },
		{ country: 'X', type: 'hits' },
		{ continent: 'EU', country: 'PL', type: 'hits' },
		{ type: 'X' },
		{ type: 'hits', period: 'X' },
	], { status: 400 });
}
