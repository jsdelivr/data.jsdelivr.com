const { expect } = require('chai');
const { makeEndpointAssertions, makeEndpointPaginationTests, setupSnapshots } = require('../../../../utils');

describe('/v1/stats/periods', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	makeStatsPeriodsTests();
});

function makeStatsPeriodsTests () {
	makeEndpointAssertions('/v1/stats/periods', {}, [
		{
			params: {},
			assert: (response) => {
				expect(response.body.filter(item => item.links.browsers)).to.have.lengthOf(11);
				expect(response.body.filter(item => item.links.network)).to.have.lengthOf(4);
				expect(response.body.filter(item => item.links.packages)).to.have.lengthOf(4);
				expect(response.body.filter(item => item.links.platforms)).to.have.lengthOf(11);
				expect(response.body.filter(item => item.links.proxies)).to.have.lengthOf(4);
				expect(response.body).to.have.lengthOf(13);
				expect(response).to.matchSnapshot();
			},
		},
	]);

	makeEndpointPaginationTests('/v1/stats/periods');
}
