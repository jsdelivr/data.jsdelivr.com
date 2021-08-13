const nock = require('nock');
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

const server = require('../../../src');

chai.use(chaiHttp);

const testCases = require('../../data/v1/entrypoints.json');

const seedTestData = async (entrypointsTestData) => {
	await db('package_entrypoints').delete();
	await db('cdnjs_package').delete();

	// test packages
	let [ packageId ] = await db('package').insert({ name: 'entrypoint', type: 'npm' });

	// entrypoints
	for (let [ packageName, data ] of Object.entries(entrypointsTestData)) {
		let [ name, version ] = packageName.split('@');

		if (data.db.entrypoints) {
			await db('package_entrypoints').insert({ type: 'npm', name, version, entrypoints: JSON.stringify(data.db.entrypoints) });
		}

		if (data.db.cdnjs) {
			await db('cdnjs_package').insert({ name, version, filename: data.db.cdnjs });
		}

		if (data.db.stats) {
			let [ versionId ] = await db('package_version').insert({ packageId, version, type: 'version' });

			for (let st of data.db.stats) {
				let [ fileId ] = await db('file').insert({ packageVersionId: versionId, filename: st.file });
				await db('file_hits').insert(st.hits.map(h => ({ fileId, ...h })));
			}
		}
	}

	// All hits for test entrypoint files must be in this date range
	await db.raw(`call updateViewTopPackageFiles('2021-08-01', '2021-08-31')`);
};

describe('/v1/package/:package/entrypoints', () => {
	before(async () => {
		await seedTestData(testCases);
	});

	for (let [ packageName, data ] of Object.entries(testCases)) {
		it(`GET /v1/package/npm/${packageName}/entrypoints`, () => {
			return chai.request(server)
				.get(`/v1/package/npm/${packageName}/entrypoints`)
				.then((response) => {
					expect(response).to.have.status(200);
					expect(response).to.have.header('Access-Control-Allow-Origin', '*');
					expect(response).to.have.header('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400, stale-if-error=86400');
					expect(response).to.have.header('Timing-Allow-Origin', '*');
					expect(response).to.have.header('Vary', 'Accept-Encoding');
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

	it(`GET /v1/package/npm/entrypoint@no-local-cache/entrypoints`, async () => {
		nock('https://cdn.jsdelivr.net')
			.get('/npm/entrypoint@no-local-cache/+private-entrypoints')
			.times(1)
			.reply(200, { version: 'no-local-cache', default: '/index.js', entrypoints: { main: '/index.js' } });

		return chai.request(server)
			.get('/v1/package/npm/entrypoint@no-local-cache/entrypoints')
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

	it(`GET /v1/package/npm/entrypoint@no-local-cache-empty-remote/entrypoints`, async () => {
		nock('https://cdn.jsdelivr.net')
			.get('/npm/entrypoint@no-local-cache-empty-remote/+private-entrypoints')
			.times(1)
			.reply(200, { version: 'no-local-cache-empty-remote' });

		return chai.request(server)
			.get('/v1/package/npm/entrypoint@no-local-cache-empty-remote/entrypoints')
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

	it(`GET /v1/package/npm/entrypoint@no-local-cache-404-remote/entrypoints`, async () => {
		nock('https://cdn.jsdelivr.net')
			.get('/npm/entrypoint@no-local-cache-404-remote/+private-entrypoints')
			.times(1)
			.reply(404);

		return chai.request(server)
			.get('/v1/package/npm/entrypoint@no-local-cache-404-remote/entrypoints')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.status).to.equal(404);
				expect(response.body.message).to.equal('Couldn\'t find version no-local-cache-404-remote for entrypoint. Make sure you use a specific version number, and not a version range or an npm tag.');
			});
	});

	it(`GET /v1/package/npm/entrypoint@no-local-cache-500-remote/entrypoints`, async () => {
		nock('https://cdn.jsdelivr.net')
			.get('/npm/entrypoint@no-local-cache-500-remote/+private-entrypoints')
			.times(1)
			.reply(500);

		return chai.request(server)
			.get('/v1/package/npm/entrypoint@no-local-cache-500-remote/entrypoints')
			.then((response) => {
				expect(response).to.have.status(500);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.status).to.equal(502);
				expect(response.body.message).to.equal('Couldn\'t find entrypoint@no-local-cache-500-remote.');
			});
	});

	it(`GET /v1/package/npm/entrypoint@no-local-cache-different-remote-version/entrypoints`, async () => {
		nock('https://cdn.jsdelivr.net')
			.get('/npm/entrypoint@no-local-cache-different-remote-version/+private-entrypoints')
			.times(1)
			.reply(200, { version: '1.0.0' });

		return chai.request(server)
			.get('/v1/package/npm/entrypoint@no-local-cache-different-remote-version/entrypoints')
			.then((response) => {
				expect(response).to.have.status(404);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body.status).to.equal(404);
				expect(response.body.message).to.equal('Couldn\'t find version no-local-cache-different-remote-version for entrypoint. Make sure you use a specific version number, and not a version range or an npm tag.');
			});
	});
});
