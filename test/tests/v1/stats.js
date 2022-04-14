const chai = require('chai');
const expect = chai.expect;

const config = require('config');
const { makeEndpointTests, setupSnapshots } = require('../../utils');

const server = `http://127.0.0.1:${config.get(`server.port`)}`;
const periodOptions = [ 'day', 'week', 'month', 'year', 'all', undefined ];

// How to add new tests:
// Writing tests for stats endpoints is a bit more complicated than the rest,
// because the responses include dynamically changing dates (e.g. last 30 days).
// The function below maps statically stored data from JSON files to the correct dates.
// See the existing tests for usage examples.
//
// How to get the expected output:
//  1. Write tests and use getExpectedStatsResponse() in the assertions.
//  2. Set the variable `snapshotResponses` above to `true` and run the tests.
//  3. Responses will be captured and stored in a JSON file. Check that they are correct.
//  4. Future test runs will require that the output matches the JSON file, unless `snapshotResponsesOverwrite` is set to `true`.
describe('/v1/package/stats', () => {
	setupSnapshots(__filename);

	makePackageStatsTests();
	makePackageVersionStatsTests();

	it(`GET /v1/package/npm/package-2/badge`, () => {
		return chai.request(server)
			.get(`/v1/package/npm/package-2/badge`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response.body.toString()).to.contain('720 hits/month');
			});
	});

	it(`GET /v1/package/npm/package-2/badge/rank`, () => {
		return chai.request(server)
			.get(`/v1/package/npm/package-2/badge/rank`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response.body.toString()).to.contain('#117');
			});
	});

	it(`GET /v1/package/npm/package-2/badge/type-rank`, () => {
		return chai.request(server)
			.get(`/v1/package/npm/package-2/badge/type-rank`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response.body.toString()).to.contain('#57');
			});
	});
});

describe('/v1/stats', () => {
	makeStatsPackagesTests();
	makeStatsNetworkTests();
});


function makePackageStatsTests () {
	let defaults = {
		statType: 'hits',
		groupBy: 'version',
		period: 'month',
	};

	let commonValues = {
		statType: [ 'hits', 'bandwidth', undefined ],
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

function makeStatsPackagesTests () {
	makeEndpointTests('/v1/stats/packages{/type}{/period}{?page,limit}', {
		period: 'month',
	}, [
		{ page: 2 },
		{ page: 2, limit: 10 },
		{
			type: [ 'gh', 'npm', undefined ],
			period: periodOptions,
		},
	]);
}

function makeStatsNetworkTests () {
	makeEndpointTests('/v1/stats/network{/period}', {
		period: 'month',
	}, [
		{
			period: periodOptions,
		},
	]);
}
