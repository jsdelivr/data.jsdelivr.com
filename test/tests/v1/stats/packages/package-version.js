const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all' ];

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
		type: [ 'hits', 'bandwidth' ],
		period: periodOptions,
	};

	makeEndpointSnapshotTests('/v1/stats/packages/npm/{name}@{version}{?period}', defaults, [
		{ name: 'package-0', version: '1.1.0', period: 'month' },
		{ name: 'package-0', version: '1.1.5', period: 'month' },
		{ name: 'package-0', version: '1.1.5', period: 'all' },
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
