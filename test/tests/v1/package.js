const chai = require('chai');
const expect = chai.expect;

const { setupSnapshots } = require('../../utils');

describe('/v1/package', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	it('GET /v1/package/npm/jquery', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.have.header('Deprecation');
				expect(response).to.have.header('Link', '<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/npm/-package->; rel="deprecation", <http://localhost:4454/v1/packages/npm/jquery>; rel="successor-version"');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/npm/jquery - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/npm/jquery@3.2.1', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.have.header('Deprecation');
				expect(response).to.have.header('Link', '<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/npm/-package-@-version->; rel="deprecation", <http://localhost:4454/v1/packages/npm/jquery@3.2.1>; rel="successor-version"');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/npm/jquery@3.2.1 - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/npm/jquery@3.2.1/flat', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery@3.2.1/flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.have.header('Deprecation');
				expect(response).to.have.header('Link', '<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/npm/-package-@-version->; rel="deprecation", <http://localhost:4454/v1/packages/npm/jquery@3.2.1?structure=flat>; rel="successor-version"');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/npm/jquery@3.2.1/flat - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery@3.2.1/flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/jquery/jquery', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.have.header('Deprecation');
				expect(response).to.have.header('Link', '<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/gh/-user-/-repo->; rel="deprecation", <http://localhost:4454/v1/packages/gh/jquery/jquery>; rel="successor-version"');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/jquery/jquery - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/adobe/source-sans-pro', () => {
		return chai.request(server)
			.get('/v1/package/gh/adobe/source-sans-pro')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/jquery/jquery@3.2.1', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.have.header('Deprecation');
				expect(response).to.have.header('Link', '<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/gh/-user-/-repo-@-version->; rel="deprecation", <http://localhost:4454/v1/packages/gh/jquery/jquery@3.2.1>; rel="successor-version"');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/jquery/jquery@3.2.1 - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it', () => {
		return chai.request(server)
			.get('/v1/package/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/jquery/jquery@821bf34353a6baf97f7944379a6459afb16badae', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery@821bf34353a6baf97f7944379a6459afb16badae')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/jquery/jquery@3.2.1/flat', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery@3.2.1/flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.have.header('Deprecation');
				expect(response).to.have.header('Link', '<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/gh/-user-/-repo-@-version->; rel="deprecation", <http://localhost:4454/v1/packages/gh/jquery/jquery@3.2.1?structure=flat>; rel="successor-version"');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/gh/jquery/jquery@3.2.1/flat - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery@3.2.1/flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/package/npm/foo', () => {
		return chai.request(server)
			.get('/v1/package/npm/foo')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
			});
	});

	it('GET /v1/package/npm/package-without-versions', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-without-versions')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
			});
	});

	it('GET /v1/package/npm/foo@1', () => {
		return chai.request(server)
			.get('/v1/package/npm/foo@1')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
			});
	});

	it('GET /v1/package/npm/jquery@1', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery@1')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
			});
	});

	it('GET /v1/package/npm/emojione@3.1.1', () => {
		return chai.request(server)
			.get('/v1/package/npm/emojione@3.1.1')
			.then((response) => {
				expect(response).to.have.status(403);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 403);
				expect(response.body).to.have.property('message', 'Package size exceeded the configured limit of 50 MB.');
			});
	});

	it('GET /v1/package/gh/jquery/jqueryxxx', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jqueryxxx')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
			});
	});

	it('GET /v1/package/gh/jquery/dmca-blocked-451', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/dmca-blocked-451')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
			});
	});

	it('GET /v1/package/gh/jquery/tos-blocked-403', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/tos-blocked-403')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
			});
	});
});
