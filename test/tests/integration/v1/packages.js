const chai = require('chai');
const expect = chai.expect;

const { setupSnapshots } = require('../../../utils');

describe('/v1/packages', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	it('GET /v1/packages/npm/jquery', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery - cache hit', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/@martin-kolarik/batch-queue', () => {
		return chai.request(server)
			.get('/v1/packages/npm/@martin-kolarik/batch-queue')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery@3.2.1', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery@3.2.1 - cache hit', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery@3.2.1?structure=flat', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery@3.2.1?structure=flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery@3.2.1?structure=flat - cache hit', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery@3.2.1?structure=flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/@martin-kolarik/batch-queue@1.0.0', () => {
		return chai.request(server)
			.get('/v1/packages/npm/@martin-kolarik/batch-queue@1.0.0')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery - cache hit', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/adobe/source-sans-pro', () => {
		return chai.request(server)
			.get('/v1/packages/gh/adobe/source-sans-pro')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery@3.2.1', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery@3.2.1 - cache hit', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it', () => {
		return chai.request(server)
			.get('/v1/packages/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery@821bf34353a6baf97f7944379a6459afb16badae', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery@821bf34353a6baf97f7944379a6459afb16badae')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery@3.2.1?structure=flat', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery@3.2.1?structure=flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery@3.2.1?structure=flat - cache hit', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery@3.2.1?structure=flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/foo', () => {
		return chai.request(server)
			.get('/v1/packages/npm/foo')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/packages-without-versions', () => {
		return chai.request(server)
			.get('/v1/packages/npm/package-without-versions')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/foo@1', () => {
		return chai.request(server)
			.get('/v1/packages/npm/foo@1')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery@1', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery@1')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/emojione@3.1.1', () => {
		return chai.request(server)
			.get('/v1/packages/npm/emojione@3.1.1')
			.then((response) => {
				expect(response).to.have.status(403);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 403);
				expect(response.body).to.have.property('message', 'Package size exceeded the configured limit of 50 MB.');
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jqueryxxx', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jqueryxxx')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
				expect(response).to.matchApiSchema();
			});
	});
});
