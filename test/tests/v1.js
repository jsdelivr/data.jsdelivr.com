const fs = require('fs-extra');
const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');
const expect = chai.expect;
const relativeDayUtc = require('relative-day-utc');

const server = require('../../src');
const upstreamGitHubResponses = require('../data/github.json');
const upstreamNpmResponses = require('../data/npm.json');
const upstreamCdnResponses = require('../data/cdn.json');
const expectedResponses = require('../data/expected.json');

const config = require('config');
const dbConfig = config.get('db');

chai.use(chaiHttp);

describe('v1', function () {
	this.timeout(0);

	before(async () => {
		await db.raw('SET @@foreign_key_checks = 0;');
		await db.raw(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.connection.database}\`;`);
		await db.schema.dropTableIfExists('file');
		await db.schema.dropTableIfExists('file_hits');
		await db.schema.dropTableIfExists('knex_migrations');
		await db.schema.dropTableIfExists('knex_migrations_lock');
		await db.schema.dropTableIfExists('log_file');
		await db.schema.dropTableIfExists('logs');
		await db.schema.dropTableIfExists('other_hits');
		await db.schema.dropTableIfExists('package');
		await db.schema.dropTableIfExists('package_version');
		await db.schema.dropTableIfExists('referrer');
		await db.schema.dropTableIfExists('referrer_hits');
		await db.schema.raw(fs.readFileSync(__dirname + '/../data/schema.sql', 'utf8'));

		await Promise.map(fs.readdirSync(__dirname + '/../data/db/'), (file) => {
			return db.raw(`
				START TRANSACTION;
				${fs.readFileSync(__dirname + '/../data/db/' + file, 'utf8')}
				COMMIT;
			`);
		});

		await db.raw('SET @@foreign_key_checks = 1;');

		// nock.recorder.rec();
		nock.cleanAll();
		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');

		nock('https://registry.npmjs.cf')
			.get('/jquery')
			.reply(200, upstreamNpmResponses['/jquery']);

		nock('https://cdn.jsdelivr.net')
			.get('/npm/jquery@3.2.1/+private-json')
			.reply(200, upstreamCdnResponses['/npm/jquery@3.2.1/+private-json']);

		nock('https://api.github.com')
			.get('/repos/jquery/jquery/tags')
			.query({ per_page: 100 })
			.reply(200, upstreamGitHubResponses['/repos/jquery/jquery/tags']);

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

		nock('https://registry.npmjs.cf')
			.get('/emojione')
			.reply(200, upstreamNpmResponses['/emojione']);

		nock('https://cdn.jsdelivr.net')
			.get('/npm/emojione@3.1.1/+private-json')
			.reply(403, upstreamCdnResponses['/npm/emojione@3.1.1/+private-json']);

		nock('https://registry.npmjs.org')
			.get(/.*/)
			.times(Infinity)
			.reply(504);

		nock('https://registry.npmjs.cf')
			.get(/.*/)
			.times(Infinity)
			.reply(504);
	});

	this.timeout(10000);

	it('GET /v1/', () => {
		return chai.request(server)
			.get('/v1/')
			.catch((response) => {
				expect(response).to.have.status(400);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.have.property('status', 400);
				expect(response.body).to.have.property('message');
			});
	});

	it('GET /v1/package/npm/jquery', () => {
		return chai.request(server)
			.get('/v1/package/npm/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: null });
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery2@v3.2.1', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery2@v3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: '2.020R-ro/1.075R-it' });
			});
	});

	it('GET /v1/package/gh/jquery/jquery', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/adobe/source-sans-pro@2.020R-ro%2F1.075R-it']);
			});
	});

	it('GET /v1/package/gh/jquery/jquery@3.2.1/flat', () => {
		return chai.request(server)
			.get('/v1/package/gh/jquery/jquery@3.2.1/flat')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/gh/jquery/jquery@3.2.1/flat']);
			});
	});

	it('GET /v1/package/resolve/gh/jquery/jquery@3.2.1', () => {
		return chai.request(server)
			.get('/v1/package/resolve/gh/jquery/jquery@3.2.1')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=86400');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal({ version: null });
			});
	});

	it('GET /v1/package/npm/foo', () => {
		return chai.request(server)
			.get('/v1/package/npm/foo')
			.catch((response) => {
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
			.catch((response) => {
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
			.catch((response) => {
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
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
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
			.catch((response) => {
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

	it('GET /v1/package/npm/package-1/stats?from=2017-06-26&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1/stats?from=2017-06-26&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1/stats?from=2017-06-26&to=2017-07-25']);
			});
	});

	it('GET /v1/package/npm/package-1/stats?from=2017-05-01&to=2017-05-30', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1/stats?from=2017-05-01&to=2017-05-30')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1/stats?from=2017-05-01&to=2017-05-30']);
			});
	});

	it('GET /v1/package/npm/package-1/stats/date?from=2017-06-26&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1/stats/date?from=2017-06-26&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1/stats/date?from=2017-06-26&to=2017-07-25']);
			});
	});

	it('GET /v1/package/npm/package-1/stats/date?from=2017-05-01&to=2017-05-30', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1/stats/date?from=2017-05-01&to=2017-05-30')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1/stats/date?from=2017-05-01&to=2017-05-30']);
			});
	});

	it('GET /v1/package/npm/package-1/stats?from=2017-07-24&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1/stats?from=2017-07-24&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1/stats?from=2017-07-24&to=2017-07-25']);
			});
	});

	it('GET /v1/package/npm/package-1/stats/date?from=2017-07-24&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1/stats/date?from=2017-07-24&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1/stats/date?from=2017-07-24&to=2017-07-25']);
			});
	});

	it('GET /v1/package/npm/package-9/stats/date?from=2017-07-24&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-9/stats/date?from=2017-07-24&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-9/stats/date?from=2017-07-24&to=2017-07-25']);
			});
	});

	it('GET /v1/package/npm/package-1@1.1.1/stats?from=2017-07-24&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1@1.1.1/stats?from=2017-07-24&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1@1.1.1/stats?from=2017-07-24&to=2017-07-25']);
			});
	});

	it('GET /v1/package/npm/package-1@1.1.1/stats?from=2017-05-01&to=2017-05-30', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1@1.1.1/stats?from=2017-05-01&to=2017-05-30')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1@1.1.1/stats?from=2017-05-01&to=2017-05-30']);
			});
	});

	it('GET /v1/package/npm/package-1@1.1.1/stats/date?from=2017-07-24&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1@1.1.1/stats/date?from=2017-07-24&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1@1.1.1/stats/date?from=2017-07-24&to=2017-07-25']);
			});
	});

	it('GET /v1/package/npm/package-1@1.1.1/stats/date?from=2017-05-01&to=2017-05-30', () => {
		return chai.request(server)
			.get('/v1/package/npm/package-1@1.1.1/stats/date?from=2017-05-01&to=2017-05-30')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/package/npm/package-1@1.1.1/stats/date?from=2017-05-01&to=2017-05-30']);
			});
	});

	it('GET /v1/stats/packages?from=2017-07-24&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/stats/packages?from=2017-07-24&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body[0]).to.deep.equal({
					type: 'npm',
					name: 'package-9',
					hits: 3300,
				});
			});
	});

	it('GET /v1/stats/network?from=2017-07-24&to=2017-07-25', () => {
		return chai.request(server)
			.get('/v1/stats/network?from=2017-07-24&to=2017-07-25')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/stats/network?from=2017-07-24&to=2017-07-25']);
			});
	});

	it('GET /v1/stats/network?from=2017-05-01&to=2017-05-30', () => {
		return chai.request(server)
			.get('/v1/stats/network?from=2017-05-01&to=2017-05-30')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/stats/network?from=2017-05-01&to=2017-05-30']);
			});
	});

	it('GET /v1/stats/network', () => {
		return chai.request(server)
			.get('/v1/stats/network')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public');
				expect(response).to.have.header('Expires', relativeDayUtc(1).toUTCString());
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
			});
	});

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
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
			});
	});

	it('GET /v1/lookup/hash/1B5A2D2D240F16D42C420F1CF8D911CC3BB4D4667D7631F24D064B6161E97726', () => {
		return chai.request(server)
			.get('/v1/lookup/hash/1B5A2D2D240F16D42C420F1CF8D911CC3BB4D4667D7631F24D064B6161E97726')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=31536000');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.deep.equal(expectedResponses['/v1/lookup/hash/1B5A2D2D240F16D42C420F1CF8D911CC3BB4D4667D7631F24D064B6161E97726']);
			});
	});
});
