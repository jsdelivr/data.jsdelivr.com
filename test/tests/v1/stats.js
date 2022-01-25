const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const relativeDayUtc = require('relative-day-utc');
const expect = chai.expect;

const server = require('../../../src');
const expectedResponsesPath = require.resolve('../../data/v1/expected/stats');
const expectedResponses = require(expectedResponsesPath);
const periodOptions = [ 'day', 'week', 'month', 'year', 'all', '' ];
const snapshotResponsesOverwrite = false; // Set to `true` to update all stored responses with the current outputs.
const snapshotResponses = false; // Set to `true` to store missing responses.

chai.use(chaiHttp);

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
function recalculateDates (object, diff) {
	let datePattern = /^\d{4}-\d{2}-\d{2}$/;

	if (!_.isObject(object)) {
		return object;
	} else if (Array.isArray(object)) {
		return object.map(value => recalculateDates(value, diff));
	}

	return _.mapValues(_.mapKeys(object, (value, key) => {
		if (datePattern.test(key)) {
			return new Date(relativeDayUtc(0, key).valueOf() + diff).toISOString().substr(0, 10);
		}

		return key;
	}), value => recalculateDates(value, diff));
}

function getExpectedStatsResponse (key, response, hasAllParams) {
	if (response && hasAllParams && snapshotResponses) {
		snapshotResponse(response.body, key);
	}

	if (!expectedResponses[key]) {
		return undefined;
	}

	let data = _.cloneDeep(expectedResponses[key]);
	let diff = relativeDayUtc().valueOf() - relativeDayUtc(0, data.date);
	delete data.date;

	return recalculateDates(data, diff);
}

function snapshotResponse (data, key) {
	if (expectedResponses[key]) {
		if (!snapshotResponsesOverwrite) {
			return;
		}

		let currentData = _.cloneDeep(expectedResponses[key]);
		let diff = relativeDayUtc().valueOf() - relativeDayUtc(0, currentData.date);
		delete currentData.date;

		if (_.isEqual(data, recalculateDates(currentData, diff))) {
			return;
		}
	}

	if (Array.isArray(data)) {
		expectedResponses[key] = data;
	} else {
		expectedResponses[key] = { date: new Date().toISOString().substr(0, 10), ...data };
	}

	let newExpectedResponses = _.fromPairs(Object.keys(expectedResponses).sort((a, b) => {
		let aCount = a.split('/').length;
		let bCount = b.split('/').length;

		if (aCount === bCount) {
			return a < b ? -1 : b > a;
		}

		return aCount - bCount;
	}).map(key => [ key, expectedResponses[key] ]));

	fs.writeFileSync(expectedResponsesPath, JSON.stringify(newExpectedResponses, null, '\t'));
}

describe('/v1/package/stats', () => {
	makePackageStatsTest('npm', 'package-0', 'hits', 'date', 'month');
	makePackageStatsTest('npm', 'package-x', 'hits', 'date', 'month');
	makePackageStatsTest('npm', 'package-x', 'hits', 'date', 'all');

	makePackageStatsTests('npm', 'package-2');
	makePackageStatsTests('gh', 'user/package-59');

	makePackageVersionStatsTest('npm', 'package-0', '1.1.0', 'hits', 'date', 'month');
	makePackageVersionStatsTest('npm', 'package-0', '1.1.5', 'hits', 'date', 'month');
	makePackageVersionStatsTest('npm', 'package-0', '1.1.5', 'hits', 'date', 'all');

	makePackageVersionStatsTests('npm', 'package-2', '1.1.0');
	makePackageVersionStatsTests('gh', 'user/package-59', '1.1.2');
	makePackageVersionStatsTests('gh', 'user/package-59', 'branch-1');

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
});

describe('/v1/stats', () => {
	makeStatsPackagesTest('', 'month', 2);
	makeStatsPackagesTest('', 'month', 2, 10);

	makeStatsPackagesTests();
	makeStatsNetworkTests();
});

function makePackageStatsTest (type, name, statType, groupBy, period) {
	let params = [ statType, groupBy, period ];

	it(`GET /v1/package/${type}/${name}/stats/${params.filter(v => v).join('/')}`, () => {
		return chai.request(server)
			.get(`/v1/package/${type}/${name}/stats/${params.filter(v => v).join('/')}`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(getExpectedStatsResponse(`/v1/package/${type}/${name}/stats/${statType || 'hits'}/${groupBy || 'version'}/${period || 'month'}`, response, params.every(v => v)));
			});
	});
}

function makePackageStatsTests (type, name) {
	for (let statType of [ 'hits', 'bandwidth', '' ]) {
		for (let groupBy of [ 'version', 'date', '' ]) {
			for (let period of periodOptions) {
				makePackageStatsTest(type, name, statType, groupBy, period);
			}
		}
	}
}

function makePackageVersionStatsTest (type, name, version, statType, groupBy, period) {
	let params = [ statType, groupBy, period ];

	it(`GET /v1/package/${type}/${name}@${version}/stats/${params.filter(v => v).join('/')}`, () => {
		return chai.request(server)
			.get(`/v1/package/${type}/${name}@${version}/stats/${params.filter(v => v).join('/')}`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(getExpectedStatsResponse(`/v1/package/${type}/${name}@${version}/stats/${statType || 'hits'}/${groupBy || 'file'}/${period || 'month'}`, response, params.every(v => v)));
			});
	});
}

function makePackageVersionStatsTests (type, name, version) {
	for (let statType of [ 'hits', 'bandwidth', '' ]) {
		for (let groupBy of [ 'file', 'date', '' ]) {
			for (let period of periodOptions) {
				makePackageVersionStatsTest(type, name, version, statType, groupBy, period);
			}
		}
	}
}

function makeStatsPackagesTest (type, period, page, limit) {
	let params = [ type, period ];
	let qs = new URLSearchParams(_.pickBy({ page, limit })).toString();
	qs = qs ? `?${qs}` : '';

	it(`GET /v1/stats/packages/${params.filter(v => v).join('/')}${qs}`, () => {
		return chai.request(server)
			.get(`/v1/stats/packages/${params.filter(v => v).join('/')}${qs}`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(getExpectedStatsResponse(`/v1/stats/packages${type ? `/${type}` : ''}/${period || 'month'}${qs}`, response, period));
			});
	});
}

function makeStatsPackagesTests () {
	for (let type of [ 'gh', 'npm', '' ]) {
		for (let period of periodOptions) {
			makeStatsPackagesTest(type, period);
		}
	}
}

function makeStatsNetworkTests () {
	for (let period of periodOptions) {
		let params = [ period ];

		it(`GET /v1/stats/network/${params.filter(v => v).join('/')}`, () => {
			return chai.request(server)
				.get(`/v1/stats/network/${params.filter(v => v).join('/')}`)
				.then((response) => {
					expect(response).to.have.status(200);
					expect(response).to.have.header('Access-Control-Allow-Origin', '*');
					expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
					expect(response).to.have.header('Timing-Allow-Origin', '*');
					expect(response).to.have.header('Vary', 'Accept-Encoding');
					expect(response).to.be.json;
					expect(response.body).to.deep.equal(getExpectedStatsResponse(`/v1/stats/network/${period || 'month'}`, response, params.every(v => v)));
				});
		});
	}
}
