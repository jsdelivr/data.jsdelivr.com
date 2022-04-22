const { makeEndpointTests, setupSnapshots } = require('../../../utils');

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

	let commonValues = {
		type: [ 'hits', 'bandwidth' ],
		period: periodOptions,
	};

	makeEndpointTests('/v1/package/npm/{name}/stats{?type,period}', defaults, [
		{ name: 'package-0', type: commonValues.type, period: 'month' },
		{ name: 'package-x', type: commonValues.type, period: 'month' },
		{ name: 'package-x', type: commonValues.type, period: 'all' },
		{ name: 'package-2', ...commonValues },
	]);

	makeEndpointTests('/v1/package/npm/{name}/stats{?type,period}', defaults, [
		{ name: 'package-2', type: 'hits', period: 'x' },
		{ name: 'package-2', type: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	makeEndpointTests('/v1/package/gh/{user}/{repo}/stats{?type,period}', defaults, [
		{ user: 'user', repo: 'package-59', ...commonValues },
	]);

	makeEndpointTests('/v1/package/gh/{user}/{repo}/stats{?type,period}', defaults, [
		{ user: 'user', repo: 'package-59', type: 'hits', period: 'x' },
		{ user: 'user', repo: 'package-59', type: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	// Legacy versions.
	let commonLegacyValues = {
		groupBy: [ 'version', 'date', undefined ],
		period: periodOptions,
	};

	makeEndpointTests('/v1/package/npm/{name}/stats{/groupBy}{/period}', defaults, [
		{ name: 'package-0', groupBy: 'date', period: 'month' },
		{ name: 'package-x', groupBy: 'date', period: 'month' },
		{ name: 'package-x', groupBy: 'date', period: 'all' },
		{ name: 'package-2', ...commonLegacyValues },
	]);

	makeEndpointTests('/v1/package/gh/{user}/{repo}/stats{/groupBy}{/period}', defaults, [
		{ user: 'user', repo: 'package-59', ...commonLegacyValues },
	]);

	makeEndpointTests('/v1/package/npm/{name}/stats{/groupBy}/day{?period}', defaults, [
		{ name: 'package-0', groupBy: 'date', period: 'all' },
	], {}, 'path period takes precedence over query string');
}

function makePackageVersionStatsTests () {
	let defaults = {
		groupBy: 'file',
		period: 'month',
	};

	let commonValues = {
		type: [ 'hits', 'bandwidth' ],
		period: periodOptions,
	};

	makeEndpointTests('/v1/package/npm/{name}@{version}/stats{?type,period}', defaults, [
		{ name: 'package-0', version: '1.1.0', type: commonValues.type, period: 'month' },
		{ name: 'package-0', version: '1.1.5', type: commonValues.type, period: 'month' },
		{ name: 'package-0', version: '1.1.5', type: commonValues.type, period: 'all' },
		{ name: 'package-2', version: '1.1.0', ...commonValues },
	]);

	makeEndpointTests('/v1/package/npm/{name}@{version}/stats{?type,period}', defaults, [
		{ name: 'package-2', version: '1.1.0', type: 'hits', period: 'x' },
		{ name: 'package-2', version: '1.1.0', type: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	makeEndpointTests('/v1/package/gh/{user}/{repo}@{version}/stats{?type,period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.2', ...commonValues },
		{ user: 'user', repo: 'package-59', version: 'branch-1', ...commonValues },
	]);

	makeEndpointTests('/v1/package/gh/{user}/{repo}@{version}/stats{?type,period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.2', type: 'hits', period: 'x' },
		{ user: 'user', repo: 'package-59', version: 'branch-1', type: [ 'x', undefined ], period: 'month' },
	], { status: 400 });

	// Legacy versions.
	let commonLegacyValues = {
		groupBy: [ 'file', 'date', undefined ],
		period: periodOptions,
	};

	makeEndpointTests('/v1/package/npm/{name}@{version}/stats{/groupBy}{/period}', defaults, [
		{ name: 'package-0', version: '1.1.0', groupBy: 'date', period: 'month' },
		{ name: 'package-0', version: '1.1.5', groupBy: 'date', period: 'month' },
		{ name: 'package-0', version: '1.1.5', groupBy: 'date', period: 'all' },
		{ name: 'package-2', version: '1.1.0', ...commonLegacyValues },
	]);

	makeEndpointTests('/v1/package/gh/{user}/{repo}@{version}/stats{/groupBy}{/period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.2', ...commonLegacyValues },
		{ user: 'user', repo: 'package-59', version: 'branch-1', ...commonLegacyValues },
	]);
}
