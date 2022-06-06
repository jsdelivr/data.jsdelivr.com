const chai = require('chai');
const expect = chai.expect;

const path = require('path');
const urlTemplate = require('url-template');
const dateRange = require('../src/routes/utils/dateRange');
require('./plugins/wrap-it');

// based on https://stackoverflow.com/a/43053803
const cartesian = (...sets) => {
	if (sets.length === 1) {
		return sets[0].map(i => [ i ]);
	}

	return sets.reduce((accumulator, currentSet) => {
		return accumulator.flatMap((resultItem) => {
			return currentSet.map(currentSetItem => [ resultItem, currentSetItem ].flat());
		});
	});
};

function getUriWithValues (template, values, defaults) {
	return urlTemplate.parse(template).expand(defaults ? _.defaults(values, defaults) : values);
}

function makeEndpointAssertion (uriTemplate, defaults, { params, assert }, { note, status = 200 } = {}) {
	let getUri = d => getUriWithValues(uriTemplate, params, d);

	it(`GET ${getUri()}${note ? ` - ${note}` : ''}`, () => {
		return chai.request(server)
			.get(getUri())
			.then((response) => {
				assert(response, getUri(defaults));

				expect(response).to.have.status(status);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;

				if (status < 400) {
					expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				} else {
					expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				}
			});
	});
}

function makeEndpointAssertions (uriTemplate, defaults, testCases, options) {
	for (let testCase of testCases) {
		makeEndpointAssertion(uriTemplate, defaults, testCase, options);
	}
}

function makeEndpointSnapshotTest (uriTemplate, defaults, params, options) {
	makeEndpointAssertion(uriTemplate, defaults, {
		params,
		assert: (response, uri) => {
			expect(response).to.matchSnapshot(uri);

			if (params.period) {
				validateResponseForPeriod(response.body, params.period);
			}
		},
	}, options);
}

function makeEndpointSnapshotTests (uriTemplate, defaults, testTemplates, options) {
	for (let testTemplate of testTemplates) {
		let templateKeys = Object.keys(testTemplate);
		let templateValues = Object.values(testTemplate).map(item => Array.isArray(item) ? item : [ item ]);
		let testCases = cartesian(...templateValues).map(test => _.zipObject(templateKeys, test));

		for (let testValues of testCases) {
			makeEndpointSnapshotTest(uriTemplate, defaults, testValues, options);
		}
	}
}

function makeEndpointPaginationTests (uri, params = {}) {
	describe(`GET ${uri} - pagination`, () => {
		let first10;

		before(async () => {
			first10 = await chai.request(server)
				.get(uri)
				.query({ ...params, limit: 10 });
		});

		it(`returns at most 10 results`, async () => {
			expect(first10).to.have.status(200);
			expect(first10.body).to.have.length.lessThanOrEqual(10);
		});

		_.range(1, 11).forEach((index) => {
			it(`works with limit=1&page=${index}`, () => {
				return chai.request(server)
					.get(uri)
					.query({ ...params, limit: 1, page: index })
					.then((response) => {
						expect(response).to.have.status(200);
						expect(response.body).to.deep.equal(first10.body.slice(index - 1, index));
					});
			});
		});

		_.range(1, 6).forEach((index) => {
			it(`works with limit=2&page=${index}`, () => {
				return chai.request(server)
					.get(uri)
					.query({ ...params, limit: 2, page: index })
					.then((response) => {
						expect(response).to.have.status(200);
						expect(response.body).to.deep.equal(first10.body.slice((index - 1) * 2, (index - 1) * 2 + 2));
					});
			});
		});

		it('validates the limit param', () => {
			return chai.request(server)
				.get(uri)
				.query({ ...params, limit: -1 })
				.then((response) => {
					expect(response).to.have.status(400);
				});
		});

		it('validates the page param', () => {
			return chai.request(server)
				.get(uri)
				.query({ ...params, page: -1 })
				.then((response) => {
					expect(response).to.have.status(400);
				});
		});
	});
}

function validateResponseForPeriod (object, period) {
	if (!_.isObject(object)) {
		return true;
	} else if (Array.isArray(object)) {
		return object.every(value => validateResponseForPeriod(value, period));
	}

	let datePattern = /^\d{4}-\d{2}-\d{2}$/;
	let keys = Object.keys(object);

	if (keys.length > 1 && keys.every(key => datePattern.test(key))) {
		let expectedLength = dateRange.getDuration(period);

		if (expectedLength) {
			expect(keys).to.have.lengthOf(expectedLength);
		}

		return true;
	}

	return _.every(object, value => validateResponseForPeriod(value, period));
}

module.exports = {
	makeEndpointAssertions,
	makeEndpointSnapshotTests,
	makeEndpointPaginationTests,
	setupSnapshots (file) {
		chaiSnapshotInstance.setCurrentFile(path.join(
			__dirname,
			'expected',
			path.relative(path.join(__dirname, 'tests'), path.dirname(file)),
			`${path.basename(file, path.extname(file))}.json`
		));
	},
};
