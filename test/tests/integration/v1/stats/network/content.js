import { makeEndpointSnapshotTests, setupSnapshots } from '../../../../../utils.js';

const periodOptions = [
	'day', 'week', 'month', 'quarter', 'year', 'all', undefined,
	's-month', 's-quarter', 's-year', '2022-05', '2022-Q2', '2018',
];

describe('/v1/stats/network', () => {
	before(() => {
		setupSnapshots(import.meta.url);
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
