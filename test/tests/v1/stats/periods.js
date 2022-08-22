const { expect } = require('chai');
const { makeEndpointAssertions, setupSnapshots } = require('../../../utils');

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
				expect(_.every(response.body, item => item.links.browsers)).to.be.true;
				expect(_.every(response.body, item => item.links.platforms)).to.be.true;
				expect(response.body).to.have.lengthOf(7);

				// Delete the floating periods which would mess up snapshots.
				response.body.splice(0, 1);
				expect(response).to.matchSnapshot();
			},
		},
	]);
}
