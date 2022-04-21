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
		statType: 'hits',
		groupBy: 'version',
		period: 'month',
	};

	let commonValues = {
		statType: [ 'hits' ],
		groupBy: [ 'version', 'date', undefined ],
		period: periodOptions,
	};

	makeEndpointTests('/v1/package/npm/{name}/stats{/statType}{/groupBy}{/period}', defaults, [
		{ name: 'package-0', statType: 'hits', groupBy: 'date', period: 'month' },
		{ name: 'package-x', statType: 'hits', groupBy: 'date', period: 'month' },
		{ name: 'package-x', statType: 'hits', groupBy: 'date', period: 'all' },
		{ name: 'package-2', ...commonValues },
	]);

	makeEndpointTests('/v1/package/gh/{user}/{repo}/stats{/statType}{/groupBy}{/period}', defaults, [
		{ user: 'user', repo: 'package-59', ...commonValues },
	]);

	makeEndpointTests('/v1/package/npm/{name}/stats{/statType}{/groupBy}/day{?period}', defaults, [
		{ name: 'package-0', statType: 'hits', groupBy: 'date', period: 'all' },
	], 'path period takes precedence over query string');
}

function makePackageVersionStatsTests () {
	let defaults = {
		statType: 'hits',
		groupBy: 'file',
		period: 'month',
	};

	let commonValues = {
		statType: [ 'hits', 'bandwidth', undefined ],
		groupBy: [ 'file', 'date', undefined ],
		period: periodOptions,
	};

	makeEndpointTests('/v1/package/npm/{name}@{version}/stats{/statType}{/groupBy}{/period}', defaults, [
		{ name: 'package-0', version: '1.1.0', statType: 'hits', groupBy: 'date', period: 'month' },
		{ name: 'package-0', version: '1.1.5', statType: 'hits', groupBy: 'date', period: 'month' },
		{ name: 'package-0', version: '1.1.5', statType: 'hits', groupBy: 'date', period: 'all' },
		{ name: 'package-2', version: '1.1.0', ...commonValues },
	]);

	makeEndpointTests('/v1/package/gh/{user}/{repo}@{version}/stats{/statType}{/groupBy}{/period}', defaults, [
		{ user: 'user', repo: 'package-59', version: '1.1.2', ...commonValues },
		{ user: 'user', repo: 'package-59', version: 'branch-1', ...commonValues },
	]);
}
