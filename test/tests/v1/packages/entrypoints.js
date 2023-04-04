const chai = require('chai');
const expect = chai.expect;

const testCases = require('../../../data/v1/entrypoints.json');

describe('/v1/packages/entrypoints', () => {
	for (let [ packageName, data ] of Object.entries(testCases)) {
		it(`GET /v1/packages/npm/${packageName}/entrypoints`, () => {
			return chai.request(server)
				.get(`/v1/packages/npm/${packageName}/entrypoints`)
				.then((response) => {
					expect(response).to.have.status(200);
					expect(response).to.have.header('Access-Control-Allow-Origin', '*');
					expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
					expect(response).to.have.header('Timing-Allow-Origin', '*');
					expect(response).to.have.header('Vary', 'Accept-Encoding');
					expect(response).to.be.json;
					expect(response.body.entrypoints).to.deep.equal(data.expected);
				});
		});
	}

	it('should not put trash in the DB', async () => {
		let count = await db('view_top_package_files')
			.count('filename as count')
			.where({ name: 'entrypoint', version: 'no-trash-in-db' })
			.first();

		expect(count).to.deep.equal({ count: 0 });
	});

	it(`GET /v1/packages/npm/entrypoint-no-local-cache@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/packages/npm/entrypoint-no-local-cache@1.0.0/entrypoints')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.entrypoints).to.deep.equal({ js: { file: '/index.min.js', guessed: false } });
			});
	});

	it(`GET /v1/packages/npm/@scoped/entrypoint-no-local-cache@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/packages/npm/@scoped/entrypoint-no-local-cache@1.0.0/entrypoints')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.entrypoints).to.deep.equal({ js: { file: '/index.min.js', guessed: false } });
			});
	});

	it(`GET /v1/packages/npm/entrypoint-no-local-cache-empty-remote@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/packages/npm/entrypoint-no-local-cache-empty-remote@1.0.0/entrypoints')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.entrypoints).to.deep.equal({});
			});
	});

	it(`GET /v1/packages/npm/entrypoint-no-local-cache-404-remote@1.0.0-404/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/packages/npm/entrypoint-no-local-cache-404-remote@1.0.0-404/entrypoints')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.status).to.equal(404);
				expect(response.body.message).to.equal('Couldn\'t find version 1.0.0-404 for entrypoint-no-local-cache-404-remote. Make sure you use a specific version number, and not a version range or an npm tag.');
			});
	});

	it(`GET /v1/packages/npm/entrypoint-no-local-cache-500-remote@1.0.0-500/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/packages/npm/entrypoint-no-local-cache-500-remote@1.0.0-500/entrypoints')
			.then((response) => {
				expect(response).to.have.status(500);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.status).to.equal(502);
				expect(response.body.message).to.equal('Couldn\'t find entrypoint-no-local-cache-500-remote@1.0.0-500.');
			});
	});

	it(`GET /v1/packages/npm/entrypoint-no-local-cache-different-remote-version@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/packages/npm/entrypoint-no-local-cache-different-remote-version@1.0.0/entrypoints')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.status).to.equal(404);
				expect(response.body.message).to.equal('Couldn\'t find version 1.0.0 for entrypoint-no-local-cache-different-remote-version. Make sure you use a specific version number, and not a version range or an npm tag.');
			});
	});

	it(`GET /v1/packages/npm/entrypoint-over-size-limit@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/packages/npm/entrypoint-over-size-limit@1.0.0/entrypoints')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.entrypoints).to.be.empty;
			});
	});
});
