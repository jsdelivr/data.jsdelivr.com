const chai = require('chai');
const expect = chai.expect;

const path = require('path');
const urlTemplate = require('url-template');
const HttpLinkHeader = require('http-link-header');
const dateRange = require('../src/routes/utils/dateRange');
const isDeepEmpty = require('../src/routes/utils/isDeepEmpty');
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

function makeEndpointAssertion (uriTemplate, defaults, { params, assert }, { limit = params.limit || 100, note, status = 200, validateSchema = true } = {}) {
	let getUri = d => getUriWithValues(uriTemplate, params, d);
	let apiLimit = params.limit || 100;
	let page = params.page || 1, response;

	it(`GET ${getUri()}${note ? ` - ${note}` : ''}`, () => {
		let request = uri => chai.request(server)
			.get(uri)
			.then((partialResponse) => {
				if (!response) {
					response = partialResponse;
				} else {
					response.body.push(...partialResponse.body);
				}

				if (Array.isArray(partialResponse.body)) {
					if (partialResponse.body.length >= apiLimit && partialResponse.body.length < limit) {
						return request(getUriWithValues(uriTemplate, { ...params, page: ++page }));
					}

					response.body.splice(limit);
				}

				// Append ?all=true to the URI if we fetched multiple pages to avoid snapshotting collisions.
				response.req.path = getUriWithValues(uriTemplate, { ...params, all: response.body.length > apiLimit ? true : undefined }, defaults); // Add defaults here if canonical URLs are implemented.
				assert(response, response.req.path);

				expect(response).to.have.status(status);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Access-Control-Expose-Headers', '*');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;

				if (validateSchema) {
					expect(response).to.matchApiSchema();
				}

				if (status < 400) {
					if (isDeepEmpty(response.body)) {
						expect(response).to.have.header('Cache-Control', 'public, max-age=300');
					} else {
						expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
					}
				} else {
					expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				}
			});

		return request(getUri());
	});
}

function makeEndpointAssertions (uriTemplate, defaults, testCases, options) {
	for (let testCase of testCases) {
		makeEndpointAssertion(uriTemplate, defaults, testCase, options);
	}
}

function makePaginatedEndpointAssertions (uriTemplate, defaults, testCases, options) {
	uriTemplate += `${uriTemplate.includes('{?') ? '{&' : '{?'}page,limit,all}`;

	for (let testCase of testCases) {
		makeEndpointAssertion(uriTemplate, defaults, testCase, { ...options, limit: Infinity });
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

function makeEndpointPaginationTests (uri, query = {}) {
	describe(`GET ${uri} - pagination`, () => {
		let first10, first11, first98, first99;

		before(async () => {
			first10 = await chai.request(server)
				.get(uri)
				.query({ ...query, limit: 10 });

			first11 = await chai.request(server)
				.get(uri)
				.query({ ...query, limit: 11 });

			first98 = await chai.request(server)
				.get(uri)
				.query({ ...query, limit: 98 });

			first99 = await chai.request(server)
				.get(uri)
				.query({ ...query, limit: 99 });
		});

		let atMostTest = (n, getResponses) => {
			it(`returns at most ${n} results`, async () => {
				let [ r1, r2 ] = getResponses();
				let link = new HttpLinkHeader(r1.headers.link);

				expect(r1).to.have.status(200);
				expect(r1.body).to.have.length.lessThanOrEqual(n);

				expect(link.rel('first')).to.have.lengthOf(1);
				expect(link.rel('self')).to.have.lengthOf(1);
				expect(link.rel('first')[0].uri).to.equal(link.rel('self')[0].uri);

				// If there's more than one page, there should be a "next" link.
				if (r1.body.length === r2.body.length) {
					expect(link.rel('last')).to.have.lengthOf(1);
					expect(link.rel('last')[0].uri).to.equal(link.rel('self')[0].uri);

					expect(Number(r1.headers['x-total-count'])).to.be.lessThanOrEqual(n);
					expect(Number(r1.headers['x-total-pages'])).to.equal(1);
				} else {
					expect(link.rel('next')).to.have.lengthOf(1);
					expect(link.rel('next')[0].uri).to.include('page=');

					expect(link.rel('last')).to.have.lengthOf(1);
					expect(link.rel('last')[0].uri).to.include('page=');

					expect(Number(r1.headers['x-total-count'])).to.be.greaterThan(n);
					expect(Number(r1.headers['x-total-count'])).to.be.greaterThan(1);
				}
			});
		};

		atMostTest(10, () => [ first10, first11 ]);
		atMostTest(98, () => [ first98, first99 ]);

		_.range(1, 11).forEach((index) => {
			it(`works with limit=1&page=${index}`, () => {
				return chai.request(server)
					.get(uri)
					.query({ ...query, limit: 1, page: index })
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
					.query({ ...query, limit: 2, page: index })
					.then((response) => {
						expect(response).to.have.status(200);
						expect(response.body).to.deep.equal(first10.body.slice((index - 1) * 2, (index - 1) * 2 + 2));
					});
			});
		});

		it('validates the limit param', () => {
			return chai.request(server)
				.get(uri)
				.query({ ...query, limit: -1 })
				.then((response) => {
					expect(response).to.have.status(400);
				});
		});

		it('validates the page param', () => {
			return chai.request(server)
				.get(uri)
				.query({ ...query, page: -1 })
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
		let expectedLength = dateRange.parse(period).duration;

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
	makePaginatedEndpointAssertions,
	setupSnapshots (file) {
		chaiSnapshotInstance.setCurrentFile(path.join(
			__dirname,
			'snapshots',
			path.relative(path.join(__dirname, 'tests/integration'), path.dirname(file)),
			`${path.basename(file, path.extname(file))}.json`,
		));
	},
};
