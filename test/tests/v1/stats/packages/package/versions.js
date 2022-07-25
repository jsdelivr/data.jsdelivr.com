const { makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/stats/packages/versions', () => {
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

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{name}/versions{?by,period}', defaults, [
		{ name: 'package-0', by: commonValues.by, period: 'month' },
		{ name: 'package-x', by: commonValues.by, period: 'month' },
		{ name: 'package-x', by: commonValues.by, period: 'all' },
		{ name: 'package-2', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{name}/versions{?by,period}', defaults, [
		{ name: 'package-2', by: 'hits', period: 'x' },
		{ name: 'package-2', by: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}/versions{?by,period}', defaults, [
		{ user: 'user', repo: 'package-59', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}/versions{?by,period}', defaults, [
		{ user: 'user', repo: 'package-59', by: 'hits', period: 'x' },
		{ user: 'user', repo: 'package-59', by: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	makeEndpointPaginationTests('/v1/stats/packages/npm/package-59/versions', { by: 'hits', period: 'month' });
	makeEndpointPaginationTests('/v1/stats/packages/gh/user/package-59/versions', { by: 'hits', period: 'month' });
}
