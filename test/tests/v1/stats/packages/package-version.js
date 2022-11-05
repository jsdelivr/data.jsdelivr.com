const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'quarter', 'year', 'all', undefined,
	's-month', 's-quarter', 's-year', '2022-05', '2022-Q2', '2018',
];

describe('/v1/stats/packages/:type/:name@version', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makePackageVersionStatsTests();
});

function makePackageVersionStatsTests () {
	let defaults = {
		period: 'month',
	};

	let commonValues = {
		period: periodOptions,
	};

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{+name}@{version}{?period}', defaults, [
		{ name: 'package-0', version: '1.1.0', period: 'month' },
		{ name: 'package-0', version: '1.1.5', period: 'month' },
		{ name: 'package-0', version: '1.1.5', period: 'all' },
		{ name: '@scope/package-1', version: '1.1.0', period: 'month' },
		{ name: 'package-2', version: '1.1.0', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{name}@{version}{?period}', defaults, [
		{ name: 'package-2', version: '1.1.0', period: 'x' },
	], { status: 400 });

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}@{version}{?period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.2', ...commonValues },
		{ user: 'user', repo: 'package-59', version: 'branch-1', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}@{version}{?period}', defaults, [
		{ user: 'user', repo: 'package-59', version: 'branch-1', period: 'x' },
	], { status: 400 });
}
