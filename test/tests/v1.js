const fs = require('fs-extra');
const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');
const expect = chai.expect;
const { listTables, listViews } = require('../../src/lib/db/utils');

const server = require('../../src');
const upstreamGitHubResponses = require('../data/v1/github.json');
const upstreamNpmResponses = require('../data/v1/npm.json');
const upstreamCdnResponses = require('../data/v1/cdn.json');
const expectedResponses = require('../data/v1/expected.json');

const config = require('config');
const dbConfig = config.get('db');

chai.use(chaiHttp);

describe('v1', function () {
	before(async function () {
		this.timeout(0);

		if (!dbConfig.connection.database.endsWith('-test')) {
			throw new Error(`Database name for test env needs to end with "-test". Got "${dbConfig.connection.database}".`);
		}

		await db.raw('SET @@foreign_key_checks = 0;');
		await Bluebird.each(listTables(db), table => db.schema.raw(`drop table \`${table}\``));
		await Bluebird.each(listViews(db), table => db.schema.raw(`drop view \`${table}\``));
		await db.raw('SET @@foreign_key_checks = 1;');

		await db.migrate.latest();
		await db.seed.run();

		await db.schema.raw(fs.readFileSync(__dirname + '/../data/schema.sql', 'utf8'));

		// nock.recorder.rec();
		nock.cleanAll();
		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');

		nock('https://registry.npmjs.org')
			.get('/jquery')
			.reply(200, upstreamNpmResponses['/jquery']);

		nock('https://cdn.jsdelivr.net')
			.get('/npm/jquery@3.2.1/+private-json')
			.reply(200, upstreamCdnResponses['/npm/jquery@3.2.1/+private-json']);

		nock('https://api.github.com')
			.get('/repos/jquery/jquery/tags')
			.query({ per_page: 100 })
			.reply(200, upstreamGitHubResponses['/repos/jquery/jquery/tags'], {
				link: '<https://api.github.com/repos/jquery/jquery/tags?page=2>; rel="next"',
			});

		nock('https://api.github.com')
			.get('/repos/jquery/jquery/tags')
			.query({ per_page: 100, page: 2 })
			.reply(200, upstreamGitHubResponses['/repos/jquery/jquery/tags/2']);

		nock('https://api.github.com')
			.get('/repos/adobe/source-sans-pro/tags')
			.query({ per_page: 100 })
			.reply(200, upstreamGitHubResponses['/repos/adobe/source-sans-pro/tags']);

		nock('https://api.github.com')
			.get('/repos/jquery/jquery2/tags')
			.query({ per_page: 100 })
			.reply(200, upstreamGitHubResponses['/repos/jquery/jquery2/tags']);

		nock('https://cdn.jsdelivr.net')
			.get('/gh/jquery/jquery@3.2.1/+private-json')
			.reply(200, upstreamCdnResponses['/gh/jquery/jquery@3.2.1/+private-json']);

		nock('https://cdn.jsdelivr.net')
			.get('/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it/+private-json')
			.reply(200, upstreamCdnResponses['/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it/+private-json']);

		nock('https://cdn.jsdelivr.net')
			.get('/gh/jquery/jquery@821bf34353a6baf97f7944379a6459afb16badae/+private-json')
			.reply(200, upstreamCdnResponses['/gh/jquery/jquery@821bf34353a6baf97f7944379a6459afb16badae/+private-json']);

		nock('https://registry.npmjs.org')
			.get('/emojione')
			.reply(200, upstreamNpmResponses['/emojione']);

		nock('https://registry.npmjs.org')
			.get('/package-without-versions')
			.reply(200, upstreamNpmResponses['/package-without-versions']);

		nock('https://cdn.jsdelivr.net')
			.get('/npm/emojione@3.1.1/+private-json')
			.reply(403, upstreamCdnResponses['/npm/emojione@3.1.1/+private-json']);

		nock('https://registry.npmjs.org')
			.get('/foo')
			.reply(404);

		nock('https://registry.npmjs.org')
			.get('/foo')
			.reply(404);

		nock('https://api.github.com')
			.get('/repos/jquery/jqueryxxx/tags')
			.query({ per_page: 100 })
			.reply(404);

		nock('https://registry.npmjs.org')
			.get(/.*/)
			.times(Infinity)
			.reply(504);

		if (global.v8debug === undefined && !/--debug|--inspect/.test(process.execArgv.join(' ')) && !process.env.JB_PUBLISH_PORT) {
			require('blocked')((ms) => {
				throw new Error(`Blocked for ${ms} ms.`);
			}, { threshold: 100 });
		}
	});

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
	require('./v1/stats');

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
