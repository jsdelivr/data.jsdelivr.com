const chai = require('chai');
const expect = chai.expect;
const nock = require('nock');

const testCases = require('../../../../data/v1/entrypoints.json');

describe('/v1/package/entrypoints', () => {
	for (let [ packageName, data ] of Object.entries(testCases)) {
		it(`GET /v1/package/npm/${packageName}/entrypoints`, () => {
			nock('https://cdn.jsdelivr.net')
				.get(`/npm/${packageName}/+private-json`)
				.times(1)
				.reply(200, { version: '1.0.0', files: (data.db?.stats || []).map(entry => ({ name: entry.file })) });

			return chai.request(server)
				.get(`/v1/package/npm/${packageName}/entrypoints`)
				.then((response) => {
					expect(response).to.have.status(200);
					expect(response).to.have.header('Access-Control-Allow-Origin', '*');
					expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
					expect(response).to.have.header('Timing-Allow-Origin', '*');
					expect(response).to.have.header('Vary', 'Accept-Encoding');
					expect(response).to.have.header('Deprecation');

					if (packageName.startsWith('@')) {
						expect(response).to.have.header('Link', `<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/npm/@-scope-/-package-@-version-/entrypoints>; rel="deprecation", <http://localhost:4454/v1/packages/npm/${packageName}/entrypoints>; rel="successor-version"`);
					} else {
						expect(response).to.have.header('Link', `<http://localhost:4400/docs/data.jsdelivr.com#get-/v1/packages/npm/-package-@-version-/entrypoints>; rel="deprecation", <http://localhost:4454/v1/packages/npm/${packageName}/entrypoints>; rel="successor-version"`);
					}

					expect(response).to.be.json;
					expect(response.body).to.deep.equal(data.expected);
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

	it(`GET /v1/package/npm/entrypoint-no-local-cache@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/package/npm/entrypoint-no-local-cache@1.0.0/entrypoints')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ js: { file: '/index.min.js', guessed: false } });
			});
	});

	it(`GET /v1/package/npm/entrypoint-no-local-cache-empty-remote@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/package/npm/entrypoint-no-local-cache-empty-remote@1.0.0/entrypoints')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({});
			});
	});

	it(`GET /v1/package/npm/entrypoint-no-local-cache-404-remote@1.0.0-404/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/package/npm/entrypoint-no-local-cache-404-remote@1.0.0-404/entrypoints')
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

	it(`GET /v1/package/npm/entrypoint-no-local-cache-500-remote@1.0.0-500/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/package/npm/entrypoint-no-local-cache-500-remote@1.0.0-500/entrypoints')
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

	it(`GET @1.0.0/v1/package/npm/entrypoint-no-local-cache-different-remote-version@1.0.0/entrypoints`, async () => {
		return chai.request(server)
			.get('/v1/package/npm/entrypoint-no-local-cache-different-remote-version@1.0.0/entrypoints')
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
});
