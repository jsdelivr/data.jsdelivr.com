process.env.NODE_ENV = 'test';

require('@sinonjs/fake-timers').install({ now: new Date('2022-07-05T00:00:00Z'), shouldAdvanceTime: true });
console.log(`Starting with fake time set to ${new Date().toISOString()}`);

require('../src/lib/startup');
const http = require('http');
const nock = require('nock');
const config = require('config');

const serverCallback = require('../src');
const setupDb = require('./setup-db');

const upstreamNpmResponses = require('./data/v1/npm.json');
const upstreamCdnResponses = require('./data/v1/cdn.json');
const upstreamGitHubResponses = require('./data/v1/github.json');

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

	nock('https://registry.npmjs.org')
		.get('/@martin-kolarik%2Fbatch-queue')
		.reply(200, upstreamNpmResponses['/@martin-kolarik%2Fbatch-queue']);

	nock('https://cdn.jsdelivr.net')
		.get('/npm/emojione@3.1.1/+private-json')
		.reply(403, upstreamCdnResponses['/npm/emojione@3.1.1/+private-json']);

	nock('https://cdn.jsdelivr.net')
		.get('/npm/@martin-kolarik/batch-queue@1.0.0/+private-json')
		.reply(200, upstreamCdnResponses['/npm/@martin-kolarik/batch-queue@1.0.0/+private-json']);

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

	nock('https://api.github.com')
		.get('/repos/jquery/dmca-blocked-451/tags')
		.query({ per_page: 100 })
		.reply(451, upstreamGitHubResponses['/repos/jquery/dmca-blocked-451/tags']);

	nock('https://api.github.com')
		.get('/repos/jquery/tos-blocked-403/tags')
		.query({ per_page: 100 })
		.reply(403, upstreamGitHubResponses['/repos/jquery/tos-blocked-403/tags']);

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
		.get('/npm/@scoped/entrypoint-no-local-cache@1.0.0/+private-entrypoints')
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

	await setupDb({ databaseDate: '2022-07-05' });
};
