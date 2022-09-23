const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [
	'day', 'week', 'month', 'year', 'all', undefined,
	's-month', 's-year', '2022-04', '2018',
];

describe('/v1/stats/packages/:type/:name', () => {
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
		period: periodOptions,
	};

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{+name}{?period}', defaults, [
		{ name: 'package-0', period: 'month' },
		{ name: '@scope/package-1', period: 'month' },
		{ name: 'package-x', period: 'month' },
		{ name: 'package-x', period: 'all' },
		{ name: 'package-2', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{name}{?period}', defaults, [
		{ name: 'package-2', period: 'x' },
	], { status: 400 });

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}{?period}', defaults, [
		{ user: 'user', repo: 'package-59', ...commonValues },
	]);

	makeEndpointSnapshotTests('/v1/stats/packages/gh/{user}/{repo}{?period}', defaults, [
		{ user: 'user', repo: 'package-59', period: 'x' },
	], { status: 400 });
}
