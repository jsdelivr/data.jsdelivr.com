import { createRequire } from 'module';
import expectedResponses from '../../data/v1/expected.json' with { type: 'json' };

const require = createRequire(import.meta.url);

describe('v1', function () {
	this.timeout(10000);

	[
		'/v1/package/gh/Rikorose/DeepFilterNet@v',
		'/v1/package/gh/jquery/jquery@v/flat',
		'/v1/package/npm/@scope/package@v',
		'/v1/package/resolve/gh/jquery/jquery@v',
		'/v1/packages/gh/jquery/jquery@v',
		'/v1/packages/npm/jquery@v/entrypoints',
		'/v1/package/gh/jquery/jquery@v/stats',
		'/v1/stats/packages/gh/jquery/jquery@v/files',
	].forEach((path) => {
		it(`GET ${path} - rejects an empty normalized version`, () => {
			return chai.request(server)
				.get(path)
				.then((response) => {
					expect(response).to.have.status(400);
					expect(response).to.be.json;
					expect(response.body).to.have.property('status', 400);
					expect(response.body.message).to.include('version');
					expect(response.body.links.documentation).to.be.a('string');
				});
		});
	});

	it('GET /v1/', () => {
		return chai.request(server)
			.get('/v1/')
			.then((response) => {
				expect(response).to.have.status(400);
				expect(response).to.have.header('Link', '<http://localhost:4454/v1/spec.yaml>; rel="service-desc"; type="application/yaml", <http://localhost:4400/docs/data.jsdelivr.com>; rel="service-doc"; type="text/html"');
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

	it('GET /v1/spec.yaml', () => {
		return chai.request(server)
			.get('/v1/spec.yaml')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Content-Type', 'application/yaml');
				expect(response).to.have.header('Link', '<http://localhost:4454/v1/spec.yaml>; rel="service-desc"; type="application/yaml", <http://localhost:4400/docs/data.jsdelivr.com>; rel="service-doc"; type="text/html"');
			});
	});

	require('./v1/package.js');
	require('./v1/package/badge.js');
	require('./v1/package/entrypoints.js');
	require('./v1/package/resolve.js');
	require('./v1/package/stats.js');
	require('./v1/packages.js');
	require('./v1/packages/entrypoints.js');
	require('./v1/packages/resolved.js');
	require('./v1/stats/browsers.js');
	require('./v1/stats/browsers/countries.js');
	require('./v1/stats/browsers/platforms.js');
	require('./v1/stats/browsers/versions.js');
	require('./v1/stats/browsers/versions/countries.js');
	require('./v1/stats/network.js');
	require('./v1/stats/network/content.js');
	require('./v1/stats/network/countries.js');
	require('./v1/stats/packages.js');
	require('./v1/stats/packages/package.js');
	require('./v1/stats/packages/package/badge.js');
	require('./v1/stats/packages/package/versions.js');
	require('./v1/stats/packages/package-version.js');
	require('./v1/stats/packages/package-version/files.js');
	require('./v1/stats/periods.js');
	require('./v1/stats/platforms.js');
	require('./v1/stats/platforms/browsers.js');
	require('./v1/stats/platforms/countries.js');
	require('./v1/stats/platforms/versions.js');
	require('./v1/stats/platforms/versions/countries.js');
	require('./v1/stats/proxies/proxy.js');
	require('./v1/stats/proxies/proxy/files.js');

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
