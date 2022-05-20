const { makeEndpointTests, setupSnapshots, makePaginationTests } = require('../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/package/stats/files', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makePackageStatsTests();
});

function makePackageStatsTests () {
	let defaults = {
		period: 'month',
	};

	let commonValues = {
		by: [ 'hits', 'bandwidth' ],
		period: periodOptions,
	};

	makeEndpointTests('/v1/package/npm/{name}@{version}/stats/files{?by,period}', defaults, [
		{ name: 'package-0', version: '1.1.0', by: commonValues.by, period: 'month' },
		{ name: 'package-x', version: '1.1.0', by: commonValues.by, period: 'month' },
		{ name: 'package-x', version: '1.1.0', by: commonValues.by, period: 'all' },
		{ name: 'package-2', version: '1.1.0', ...commonValues },
	]);

	makeEndpointTests('/v1/package/npm/{name}@{version}/stats/files{?by,period}', defaults, [
		{ name: 'package-2', version: '1.1.0', by: 'hits', period: 'x' },
		{ name: 'package-2', version: '1.1.0', by: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	makePaginationTests('/v1/package/npm/package-59@1.1.0/stats/files', { by: 'hits' });

	makeEndpointTests('/v1/package/gh/{user}/{repo}@{version}/stats/files{?by,period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.0', ...commonValues },
	]);

	makeEndpointTests('/v1/package/gh/{user}/{repo}@{version}/stats/files{?by,period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.0', by: 'hits', period: 'x' },
		{ user: 'user', repo: 'package-59', version: '1.1.0', by: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	makePaginationTests('/v1/package/gh/user/package-59@1.1.0/stats/files', { by: 'hits' });
}
