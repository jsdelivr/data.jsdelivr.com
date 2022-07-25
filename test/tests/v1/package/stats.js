const { makeEndpointSnapshotTests, setupSnapshots } = require('../../../utils');

const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

describe('/v1/package/stats', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makePackageStatsTests();
	makePackageVersionStatsTests();
});

function makePackageStatsTests () {
	let defaults = {
		groupBy: 'version',
		period: 'month',
	};

	// Legacy versions.
	let commonLegacyValues = {
		groupBy: [ 'version', 'date', undefined ],
		period: periodOptions,
	};

	makeEndpointSnapshotTests('/v1/package/npm/{name}/stats{/groupBy}{/period}', defaults, [
		{ name: 'package-0', groupBy: 'date', period: 'month' },
		{ name: 'package-x', groupBy: 'date', period: 'month' },
		{ name: 'package-x', groupBy: 'date', period: 'all' },
		{ name: 'package-2', ...commonLegacyValues },
	]);

	makeEndpointSnapshotTests('/v1/package/gh/{user}/{repo}/stats{/groupBy}{/period}', defaults, [
		{ user: 'user', repo: 'package-59', ...commonLegacyValues },
	]);

	makeEndpointSnapshotTests('/v1/package/npm/{name}/stats{/groupBy}/day{?period}', defaults, [
		{ name: 'package-0', groupBy: 'date', period: 'all' },
	], { note: 'path period takes precedence over query string' });
}

function makePackageVersionStatsTests () {
	let defaults = {
		groupBy: 'file',
		period: 'month',
	};

	// Legacy versions.
	let commonLegacyValues = {
		groupBy: [ 'file', 'date', undefined ],
		period: periodOptions,
	};

	makeEndpointSnapshotTests('/v1/package/npm/{name}@{version}/stats{/groupBy}{/period}', defaults, [
		{ name: 'package-0', version: '1.1.0', groupBy: 'date', period: 'month' },
		{ name: 'package-0', version: '1.1.5', groupBy: 'date', period: 'month' },
		{ name: 'package-0', version: '1.1.5', groupBy: 'date', period: 'all' },
		{ name: 'package-2', version: '1.1.0', ...commonLegacyValues },
	]);

	makeEndpointSnapshotTests('/v1/package/gh/{user}/{repo}@{version}/stats{/groupBy}{/period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.2', ...commonLegacyValues },
		{ user: 'user', repo: 'package-59', version: 'branch-1', ...commonLegacyValues },
	]);
}
