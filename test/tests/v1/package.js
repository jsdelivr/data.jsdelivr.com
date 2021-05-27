const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

const server = require('../../../src');
const expectedResponses = require('../../data/v1/expected/package');

chai.use(chaiHttp);

describe('/v1/package', () => {
	it('GET /v1/package/npm/jquery', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/jquery']);
			});
	});

	it('GET /v1/package/npm/jquery - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/jquery']);
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
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/jquery@3.2.1']);
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
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/jquery@3.2.1']);
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
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/jquery@3.2.1/flat']);
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
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/jquery@3.2.1/flat']);
			});
	});

	it('GET /v1/package/resolve/npm/jquery@3.2', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery@3.2')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/npm/jquery@v3.2', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery@v3.2')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/npm/jquery@3.2.1', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/npm/jquery@latest', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery@latest')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/npm/jquery - implicit latest', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/npm/jquery@xxx', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery@xxx')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: null });
			});
	});

	it('GET /v1/package/resolve/npm/jquery@3.0.0-rc1', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery@3.0.0-rc1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.0.0-rc1' });
			});
	});

	it('GET /v1/package/resolve/npm/jquery@%5E3.0.0-rc1%20%3C3.0.0', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/jquery@%5E3.0.0-rc1%20%3C3.0.0')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.0.0-rc1' });
			});
	});

	it('GET /v1/package/gh/jquery/jquery', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery']);
			});
	});

	it('GET /v1/package/gh/jquery/jquery - cache hit', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery']);
			});
	});

	it('GET /v1/package/gh/adobe/source-sans-pro', () => {
		return chai.request(server)
			.get('/v1/package/gh/adobe/source-sans-pro')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/adobe/source-sans-pro']);
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
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery@3.2.1']);
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
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery@3.2.1']);
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
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it']);
			});
	});

	// TODO: add commit stats tests.
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
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery@821bf34353a6baf97f7944379a6459afb16badae']);
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
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery@3.2.1/flat']);
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
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery@3.2.1/flat']);
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery2@v3.2.1', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery2@v3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '2.020R-ro/1.075R-it' });
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery@3.2.1', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery@3.2', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery@3.2')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery@latest', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery@latest')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.2.1' });
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery@xxx', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery@xxx')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: null });
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery@3.0.0-rc1', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery@3.0.0-rc1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.0.0-rc1' });
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery@%5E3.0.0-rc1%20%3C3.0.0', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery@%5E3.0.0-rc1%20%3C3.0.0')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=43200');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '3.0.0-rc1' });
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

	it('GET /v1/package/resolve/npm/foo', () => {
		return chai.request(server)
			.get('/v1/package/resolve/npm/foo')
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

	it('GET /v1/package/resolve/gh/jquery/jqueryxxx@xxx', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jqueryxxx@xxx')
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
