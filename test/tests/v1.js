const chai = require('chai');
const expect = chai.expect;

const expectedResponses = require('../data/v1/expected.json');

describe('v1', function () {
	this.timeout(10000);

	it('GET /v1/', () => {
		return chai.request(server)
			.get('/v1/')
			.then((response) => {
				expect(response).to.have.status(400);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Cross-Origin-Resource-Policy', 'cross-origin');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 400);
				expect(response.body).to.have.property('message');
			});
	});

	require('./v1/package');
	require('./v1/package/badge');
	require('./v1/package/entrypoints');
	require('./v1/package/resolve');
	require('./v1/package/stats');
	require('./v1/packages');
	require('./v1/packages/entrypoints');
	require('./v1/packages/resolved');
	require('./v1/stats/browsers');
	require('./v1/stats/browsers/countries');
	require('./v1/stats/browsers/platforms');
	require('./v1/stats/browsers/versions');
	require('./v1/stats/browsers/versions/countries');
	require('./v1/stats/network');
	require('./v1/stats/network/content');
	require('./v1/stats/network/countries');
	require('./v1/stats/packages');
	require('./v1/stats/packages/package');
	require('./v1/stats/packages/package/badge');
	require('./v1/stats/packages/package/versions');
	require('./v1/stats/packages/package-version');
	require('./v1/stats/packages/package-version/files');
	require('./v1/stats/periods');
	require('./v1/stats/platforms');
	require('./v1/stats/platforms/browsers');
	require('./v1/stats/platforms/countries');
	require('./v1/stats/platforms/versions');
	require('./v1/stats/platforms/versions/countries');
	require('./v1/stats/proxies/proxy');

	describe('/v1/lookup', () => {
		it('GET /v1/lookup/hash/xx', () => {
			return chai.request(server)
				.get('/v1/lookup/hash/xx')
				.then((response) => {
					expect(response).to.have.status(400);
					expect(response).to.have.header('Access-Control-Allow-Origin', '*');
					expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
					expect(response).to.have.header('Timing-Allow-Origin', '*');
					expect(response).to.have.header('Vary', 'Accept-Encoding');
				});
		});

		it('GET /v1/lookup/hash/1B5A2D2D240F16D42C420F1CF8D911CC3BB4D4667D7631F24D064B6161E97729', () => {
			return chai.request(server)
				.get('/v1/lookup/hash/1B5A2D2D240F16D42C420F1CF8D911CC3BB4D4667D7631F24D064B6161E97729')
				.then((response) => {
					expect(response).to.have.status(404);
					expect(response).to.have.header('Access-Control-Allow-Origin', '*');
					expect(response).to.have.header('Cache-Control', 'public, max-age=86400');
					expect(response).to.have.header('Timing-Allow-Origin', '*');
					expect(response).to.have.header('Vary', 'Accept-Encoding');
				});
		});

		it('GET /v1/lookup/hash/AFAC519CC8E522B42073B24C5D45BD7E28A68ADB823E3D5CB1869EA08BE468D6', () => {
			return chai.request(server)
				.get('/v1/lookup/hash/AFAC519CC8E522B42073B24C5D45BD7E28A68ADB823E3D5CB1869EA08BE468D6')
				.then((response) => {
					expect(response).to.have.status(200);
					expect(response).to.have.header('Access-Control-Allow-Origin', '*');
					expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
					expect(response).to.have.header('Timing-Allow-Origin', '*');
					expect(response).to.have.header('Vary', 'Accept-Encoding');
					expect(response).to.be.json;
					expect(response.body).to.deep.equal(expectedResponses['/v1/lookup/hash/AFAC519CC8E522B42073B24C5D45BD7E28A68ADB823E3D5CB1869EA08BE468D6']);
				});
		});
	});
});
