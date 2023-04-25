const { makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'quarter', 'year', 'all', undefined,
	's-month', 's-quarter', 's-year', '2022-05', '2022-Q2', '2018',
];

describe('/v1/stats/packages/versions', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makePackageStatsTests();
});

function makePackageStatsTests () {
	let defaults = {
		by: 'hits',
		period: 'month',
	};

	let commonValues = {
		by: [ 'hits', 'bandwidth', undefined ],
		period: periodOptions,
	};

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{+name}/versions{?by,period}', defaults, [
		{ name: 'package-0', by: commonValues.by, period: 'month' },
		{ name: '@scope/package-1', by: commonValues.by, period: 'month' },
		{ name: 'package-x', by: commonValues.by, period: 'month' },
		{ name: 'package-x', by: commonValues.by, period: 'all' },
		{ name: 'package-2', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{name}/versions{?by,period}', defaults, [
		{ name: 'package-2', by: 'hits', period: 'x' },
		{ name: 'package-2', by: [ 'x' ], period: 'month' },
	], { status: 400 });

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}/versions{?by,period}', defaults, [
		{ user: 'user', repo: 'package-59', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}/versions{?by,period}', defaults, [
		{ user: 'user', repo: 'package-59', by: 'hits', period: 'x' },
		{ user: 'user', repo: 'package-59', by: [ 'x' ], period: 'month' },
	], { status: 400 });

	makeEndpointPaginationTests('/v1/stats/packages/npm/package-2/versions', { by: 'hits', period: 'month' });
	makeEndpointPaginationTests('/v1/stats/packages/gh/user/package-59/versions', { by: 'hits', period: 'month' });
	makeEndpointPaginationTests('/v1/stats/packages/gh/user/package-xx/versions', { by: 'hits', period: 'month' });
}
