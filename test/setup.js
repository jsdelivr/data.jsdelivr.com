process.env.NODE_ENV = 'test';
require('../src/lib/startup');

const fs = require('fs-extra');
const http = require('http');
const nock = require('nock');
const path = require('path');
const crypto = require('crypto');
const config = require('config');
const readdir = require('recursive-readdir');

const serverCallback = require('../src');
const { listTables, listViews } = require('../src/lib/db/utils');

const upstreamNpmResponses = require('./data/v1/npm.json');
const upstreamCdnResponses = require('./data/v1/cdn.json');
const upstreamGitHubResponses = require('./data/v1/github.json');
const dbConfig = config.get('db');

module.exports.mochaGlobalSetup = async () => {
	nock.disableNetConnect();
	nock.enableNetConnect('127.0.0.1');

	await Bluebird.fromCallback((callback) => {
		http.createServer(serverCallback).listen(process.env.PORT || config.get('server.port'), callback);
	});

	// nock.recorder.rec();
	nock.cleanAll();
	nock.disableNetConnect();
	nock.enableNetConnect('127.0.0.1');

	// package tests
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
			link: '<https://api.github.com/repos/jquery/jquery/tags?per_page=100&page=2>; rel="next"',
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

	nock('https://cdn.jsdelivr.net')
		.get('/npm/foo@1/+private-json')
		.reply(404, upstreamCdnResponses['/npm/foo@1/+private-json']);

	nock('https://cdn.jsdelivr.net')
		.get('/npm/jquery@1/+private-json')
		.reply(404, upstreamCdnResponses['/npm/jquery@1/+private-json']);

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

	// entrypoint tests
	nock('https://cdn.jsdelivr.net')
		.get('/npm/entrypoint-no-local-cache@1.0.0/+private-entrypoints')
		.times(1)
		.reply(200, { version: '1.0.0', entrypoints: { main: '/index.js' } });

	nock('https://cdn.jsdelivr.net')
		.get('/npm/entrypoint-no-local-cache-empty-remote@1.0.0/+private-entrypoints')
		.times(1)
		.reply(200, { version: '1.0.0', entrypoints: {} });

	nock('https://cdn.jsdelivr.net')
		.get('/npm/entrypoint-no-local-cache-404-remote@1.0.0-404/+private-entrypoints')
		.times(1)
		.reply(404);

	nock('https://cdn.jsdelivr.net')
		.get('/npm/entrypoint-no-local-cache-500-remote@1.0.0-500/+private-entrypoints')
		.times(1)
		.reply(500);

	nock('https://cdn.jsdelivr.net')
		.get('/npm/entrypoint-no-local-cache-different-remote-version@1.0.0/+private-entrypoints')
		.times(1)
		.reply(200, { version: '2.0.0' });

	if (!dbConfig.connection.database.endsWith('-test')) {
		throw new Error(`Database name for test env needs to end with "-test". Got "${dbConfig.connection.database}".`);
	}

	let [ dbEntry, currentHash ] = await Promise.all([
		getCurrentDbHash(),
		hashDbSetupFiles(),
	]);

	if (dbEntry?.value === currentHash) {
		log.debug(`Database setup didn't change since last run. Skipping.`);
	} else {
		log.debug('Dropping existing tables.');
		await db.raw('SET @@foreign_key_checks = 0;');
		await Bluebird.each(listTables(db), table => db.schema.raw(`drop table \`${table}\``));
		await Bluebird.each(listViews(db), table => db.schema.raw(`drop view \`${table}\``));
		await db.raw('SET @@foreign_key_checks = 1;');

		log.debug('Setting up the database.');
		await db.migrate.latest();

		log.debug('Inserting test data.');
		await db.seed.run();

		log.debug('Generating materialized views.');
		await db.schema.raw(fs.readFileSync(__dirname + '/data/schema.sql', 'utf8'));
		await db('_test').insert({ key: 'hash', value: currentHash });

		log.debug('Test setup done.');
	}
};

async function getCurrentDbHash () {
	return db('_test').where({ key: 'hash' }).first().catch(() => null);
}

async function hashDbSetupFiles () {
	let files = await Bluebird.map(_.sortBy([
		...await readdir(path.join(__dirname, '../migrations')),
		...await readdir(path.join(__dirname, '../seeds')),
		path.join(__dirname, '/data/schema.sql'),
	]), file => fs.readFile(file), { concurrency: 32 });

	return files.reduce((hash, file) => {
		return hash.update(file);
	}, crypto.createHash('sha256')).digest('hex');
}
