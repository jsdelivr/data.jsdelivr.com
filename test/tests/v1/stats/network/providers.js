const { makeEndpointTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/stats/network/providers', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsNetworkProvidersTests();
});

function makeStatsNetworkProvidersTests () {
	makeEndpointTests('/v1/stats/network/providers{?type,period}', {
		period: 'month',
	}, [
		{
			type: [ 'hits', 'bandwidth' ],
			period: periodOptions,
		},
	]);
}
