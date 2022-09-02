const chai = require('chai');
const { setupSnapshots } = require('../../../utils');
const expect = chai.expect;

describe('/v1/packages/resolved', () => {
	before(() => {
		setupSnapshots(__filename);
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=3.2', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=3.2')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=v3.2', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=v3.2')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=3.2.1', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=latest', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=latest')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved - implicit latest', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=xxx', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=xxx')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: null });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=3.0.0-rc1', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=3.0.0-rc1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.0.0-rc1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=%5E3.0.0-rc1%20%3C3.0.0', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=%5E3.0.0-rc1%20%3C3.0.0')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.0.0-rc1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery2/resolved?specifier=v3.2.1', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery2/resolved?specifier=v3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/adobe/source-sans-pro/resolved?specifier=2.020R-ro%2F1.075R-it', () => {
		return chai.request(server)
			.get('/v1/packages/gh/adobe/source-sans-pro/resolved?specifier=2.020R-ro%2F1.075R-it')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '2.020R-ro/1.075R-it' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery/resolved?specifier=3.2.1', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery/resolved?specifier=3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery/resolved?specifier=3.2', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery/resolved?specifier=3.2')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery/resolved?specifier=latest', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery/resolved?specifier=latest')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery/resolved?specifier=xxx', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery/resolved?specifier=xxx')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: null });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery/resolved?specifier=3.0.0-rc1', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery/resolved?specifier=3.0.0-rc1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.0.0-rc1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery/resolved?specifier=%5E3.0.0-rc1%20%3C3.0.0', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery/resolved?specifier=%5E3.0.0-rc1%20%3C3.0.0')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.0.0-rc1' });
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/npm/foo/resolved', () => {
		return chai.request(server)
			.get('/v1/packages/npm/foo/resolved')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
				expect(response).to.matchSnapshot();
			});
	});

	it('GET /v1/packages/gh/jquery/jqueryxxx/resolved?specifier=xxx', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jqueryxxx/resolved?specifier=xxx')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 404);
				expect(response.body).to.have.property('message');
				expect(response).to.matchSnapshot();
			});
	});
});
