const { expect } = require('chai');
const { makePaginatedEndpointAssertions, makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../../utils');

describe('/v1/stats/platforms/countries', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsPlatformsVersionTests();
});

function makeStatsPlatformsVersionTests () {
	makePaginatedEndpointAssertions('/v1/stats/platforms/platform%2019/countries{?continent,period}', {}, [
		{
			params: { period: '2020-04' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(14.26, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(9.66, .1);
				expect(response.body).to.have.lengthOf(239); // only those with at least 0.01 % share
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-04', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(14.26, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(9.66, .1);
				expect(response.body).to.have.lengthOf(52);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.56, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response.body).to.have.lengthOf(238);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.56, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response.body).to.have.lengthOf(52);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.70, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response.body).to.have.lengthOf(238);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.70, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
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

	makeEndpointPaginationTests('/v1/stats/platforms/platform%2019/countries', { period: '2020-04' });

	makeEndpointSnapshotTests('/v1/stats/platforms/platform%2019/countries{?continent,period}', {}, [
		{ continent: 'X' },
		{ period: 'month' },
	], { status: 400 });
}
