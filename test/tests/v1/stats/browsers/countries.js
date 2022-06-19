const { expect } = require('chai');
const { makePaginatedEndpointAssertions, makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../../utils');

describe('/v1/stats/browsers/countries', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsBrowsersVersionTests();
});

function makeStatsBrowsersVersionTests () {
	makePaginatedEndpointAssertions('/v1/stats/browsers/browser%2019/countries{?continent,period}', {}, [
		{
			params: { period: '2020-04' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(14.92, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.closeTo(9.89, .1));
				expect(response.body).to.have.lengthOf(249);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-04', continent: 'EU' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(14.92, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.closeTo(9.89, .1));
				expect(response.body).to.have.lengthOf(52);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(14.19, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.null);
				expect(response.body).to.have.lengthOf(249);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02', continent: 'EU' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(14.19, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.null);
				expect(response.body).to.have.lengthOf(52);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(14.33, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.null);
				expect(response.body).to.have.lengthOf(249);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020', continent: 'EU' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(14.33, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.null);
				expect(response.body).to.have.lengthOf(52);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2019' },
			assert: (response) => {
				expect(response.body).to.be.empty;
			},
		},
	]);

	makeEndpointPaginationTests('/v1/stats/browsers/browser%2019/countries', { period: '2020-04' });

	makeEndpointSnapshotTests('/v1/stats/browsers/browser%2019/countries{?continent,period}', {}, [
		{ continent: 'X' },
		{ period: 'month' },
	], { status: 400 });
}
