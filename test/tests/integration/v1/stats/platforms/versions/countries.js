const { expect } = require('chai');
const { makePaginatedEndpointAssertions, makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../../../../utils');

describe('/v1/stats/platforms/versions/countries', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsPlatformsVersionTests();
});

function makeStatsPlatformsVersionTests () {
	makePaginatedEndpointAssertions('/v1/stats/platforms/platform%2019/versions/2/countries{?continent,period}', {}, [
		{
			params: { period: '2020-04' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(5.09, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.closeTo(3.33, .1));
				expect(response.body).to.have.lengthOf(249);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-04', continent: 'EU' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(5.09, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.closeTo(3.33, .1));
				expect(response.body).to.have.lengthOf(52);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(4.84, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.null);
				expect(response.body).to.have.lengthOf(249);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02', continent: 'EU' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(4.84, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.null);
				expect(response.body).to.have.lengthOf(52);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(4.88, .1));
				response.body.forEach(country => expect(country.prev.share).to.be.null);
				expect(response.body).to.have.lengthOf(249);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020', continent: 'EU' },
			assert: (response) => {
				response.body.forEach(country => expect(country.share).to.be.closeTo(4.88, .1));
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

	makeEndpointPaginationTests('/v1/stats/platforms/platform%2019/versions/2/countries', { period: '2020-04' });

	makeEndpointSnapshotTests('/v1/stats/platforms/platform%2019/versions/2/countries{?continent,period}', {}, [
		{ continent: 'X' },
		{ period: 'month' },
	], { status: 400 });
}
