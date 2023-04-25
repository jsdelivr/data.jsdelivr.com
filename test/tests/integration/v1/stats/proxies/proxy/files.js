const { makeEndpointSnapshotTests, setupSnapshots, makeEndpointPaginationTests } = require('../../../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'quarter', 'year', 'all', undefined,
	's-month', 's-quarter', 's-year', '2022-05', '2022-Q2', '2018',
];

describe('/v1/stats/proxies/proxy/files', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeProxyFilesStatsTests();
});

function makeProxyFilesStatsTests () {
	let defaults = {
		by: 'hits',
		period: 'month',
	};

	makeEndpointSnapshotTests('/v1/stats/proxies/{name}/files{?by,period}', defaults, [
		{ name: 'wp-plugins', by: [ 'hits', 'bandwidth', undefined ], period: periodOptions },
	]);


	makeEndpointSnapshotTests('/v1/stats/proxies/{name}/files{?by,period}', defaults, [
		{ name: 'wp-plugins', by: 'hits', period: 'x' },
		{ name: 'wp-plugins', by: [ 'x' ], period: 'month' },
	], { status: 400 });

	makeEndpointPaginationTests('/v1/stats/proxies/wp-plugins/files', { by: 'hits', period: 'month' });
	makeEndpointPaginationTests('/v1/stats/proxies/xxx/files', { by: 'hits', period: 'month' });
}
