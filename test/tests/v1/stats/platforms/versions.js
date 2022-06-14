const { expect } = require('chai');
const { makeEndpointAssertions, makeEndpointSnapshotTests, makeEndpointPaginationTests, setupSnapshots } = require('../../../../utils');

describe('/v1/stats/platforms/versions', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsPlatformsVersionTests();
	makeStatsPlatformsVersionsTests();
});

function makeStatsPlatformsVersionTests () {
	makeEndpointAssertions('/v1/stats/platforms/platform%2019/versions{?continent,country,period}', {}, [
		{
			params: { period: '2020-04' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(14.26, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(9.66, .1);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-04', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(14.26, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(9.66, .1);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-04', country: 'PL' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(14.26, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(9.66, .1);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.56, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.56, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02', country: 'PL' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.56, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.70, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020', country: 'PL' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.70, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(13.70, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
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

	makeEndpointPaginationTests('/v1/stats/platforms/platform%2019/versions', { period: '2020-04' });

	makeEndpointSnapshotTests('/v1/stats/platforms/platform%2019/versions{?continent,country,period}', {}, [
		{ continent: 'X' },
		{ country: 'X' },
		{ continent: 'EU', country: 'PL' },
		{ period: 'month' },
	], { status: 400 });
}

function makeStatsPlatformsVersionsTests () {
	makeEndpointAssertions('/v1/stats/platforms/versions{?continent,country,period}', {}, [
		{
			params: { period: '2020-04' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(87.30, .1);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-04', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(87.30, .1);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-04', country: 'PL' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.sumBy(response.body, 'prev.share')).to.be.closeTo(87.30, .1);
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020-02', country: 'PL' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020', continent: 'EU' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
				expect(response).to.matchSnapshot();
			},
		},
		{
			params: { period: '2020', country: 'PL' },
			assert: (response) => {
				expect(_.sumBy(response.body, 'share')).to.be.closeTo(100, .1);
				expect(_.every(response.body, result => result.prev.share === null)).to.be.true;
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

	makeEndpointPaginationTests('/v1/stats/platforms/versions', { period: '2020-04' });

	makeEndpointSnapshotTests('/v1/stats/platforms/versions{?continent,country,period}', {}, [
		{ continent: 'X' },
		{ country: 'X' },
		{ continent: 'EU', country: 'PL' },
		{ period: 'month' },
	], { status: 400 });
}
