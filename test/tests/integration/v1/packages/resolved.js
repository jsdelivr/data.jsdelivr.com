import { setupSnapshots } from '../../../../utils.js';
import nock from 'nock';
import redis from '../../../../../src/lib/redis/index.js';
import RedisRemoteResourceCache, { PromiseCacheShared } from '../../../../../src/remote-services/RedisRemoteResourceCache.js';
import GitHubRemoteService from '../../../../../src/remote-services/GitHubRemoteService.js';

describe('/v1/packages/resolved', () => {
	before(() => {
		setupSnapshots(import.meta.url);
	});

	describe('GitHub repository casing', () => {
		let cache = new RedisRemoteResourceCache('pr/gh');

		it('shares full listings across owner and repository casing without changing response names', async () => {
			let upstream = nock('https://api.github.com').get('/repos/Case-Tests/Listing/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'v1.2.3' }, { name: 'Release' }]);

			for (let name of [ 'Case-Tests/Listing', 'case-tests/listing', 'CASE-TESTS/LISTING' ]) {
				let response = await chai.request(server).get(`/v1/packages/gh/${name}`);
				expect(response).to.have.status(200);
				expect(response.body.name).to.equal(name);
				expect(response.body.versions.map(item => item.version)).to.have.members([ '1.2.3', 'Release' ]);
			}

			expect((await cache.getCached('/case-tests/listing')).statusCode).to.equal(200);
			expect(await cache.getCached('/Case-Tests/Listing')).to.equal(null);
			expect(upstream.isDone()).to.be.true;
		});

		it('shares first-page and prefix caches while keeping literal tags case-sensitive', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/Case-Tests/Prefix/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }], {
					link: '<https://api.github.com/repos/case-tests/prefix/tags?per_page=100&page=11>; rel="last"',
				})
				.get(path => decodeURIComponent(path) === '/repos/Case-Tests/Prefix/git/matching-refs/tags/Release').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/Release' }])
				.get(path => decodeURIComponent(path) === '/repos/case-tests/prefix/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/release' }]);

			for (let [ name, specifier ] of [ [ 'Case-Tests/Prefix', 'Release' ], [ 'CASE-TESTS/PREFIX', 'Release' ], [ 'case-tests/prefix', 'release' ] ]) {
				let response = await chai.request(server).get(`/v1/packages/gh/${name}/resolved?specifier=${specifier}`);
				expect(response).to.have.status(200);
				expect(response.body.version).to.equal(specifier);
			}

			expect(upstream.isDone()).to.be.true;
		});

		it('reuses canonical data through mixed-case aliases without rewriting repository metadata', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/case-tests/current/tags').query({ per_page: 100 }).reply(200, [{ name: 'v2.0.0' }])
				.get('/repos/Case-Tests/Old/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/8101/tags?per_page=100' })
				.get('/repositories/8101').reply(200, { full_name: 'Case-Tests/Current' }, { etag: '"case-8101"' });

			for (let name of [ 'case-tests/current', 'Case-Tests/Old' ]) {
				let response = await chai.request(server).get(`/v1/packages/gh/${name}`);
				expect(response).to.have.status(200);
				expect(response.body.versions.map(item => item.version)).to.deep.equal([ '2.0.0' ]);
			}

			let alias = await cache.getCached('/case-tests/old');
			expect(alias.props.redirect.name).to.equal('Case-Tests/Current');
			expect(alias.props.redirect.source).to.equal('Case-Tests/Old');

			let response = await chai.request(server).get('/v1/packages/gh/CASE-TESTS/OLD/resolved?specifier=2.0.0');
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('2.0.0');
			expect(upstream.isDone()).to.be.true;
		});

		it('does not treat a case-only redirect as a repository rename', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/case-tests/same/tags').query({ per_page: 100 }).twice()
				.reply(301, '', { location: 'https://api.github.com/repositories/8102/tags?per_page=100' })
				.get('/repositories/8102').reply(200, { full_name: 'Case-Tests/Same' })
				.get('/repositories/8102/tags').query({ per_page: 100 }).reply(200, [{ name: 'v3.0.0' }]);
			let response = await chai.request(server).get('/v1/packages/gh/case-tests/same');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '3.0.0' ]);
			expect((await cache.getCached('/case-tests/same')).props.redirect).to.equal(undefined);
			expect(upstream.isDone()).to.be.true;
		});
	});

	describe('GitHub repository redirects', () => {
		let cache = new RedisRemoteResourceCache('pr/gh');
		let oneMonth = 30 * 24 * 60 * 60 * 1000;

		async function warmRename (name, id) {
			let current = `${name}-current`;
			let upstream = nock('https://api.github.com')
				.get(`/repos/rename-tests/${current}/tags`).query({ per_page: 100 })
				.reply(200, [{ name: 'v1.2.3' }, { name: 'release' }])
				.get(`/repos/rename-tests/${name}/tags`).query({ per_page: 100 })
				.reply(301, '', { location: `https://api.github.com/repositories/${id}/tags?per_page=100` })
				.get(`/repositories/${id}`)
				.reply(200, { full_name: `rename-tests/${current}` }, { etag: `"repo-${id}"` });

			for (let repo of [ current, name ]) {
				let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${repo}`);
				expect(response).to.have.status(200);
				expect(response.body.versions.map(item => item.version)).to.have.members([ '1.2.3', 'release' ]);
			}

			expect(upstream.isDone()).to.be.true;
			return { name, current, id, key: `/rename-tests/${name}` };
		}

		it('stores only redirect metadata under the old name and reuses canonical data for resolution', async () => {
			let { name, current, key } = await warmRename('warm', 7001);
			let alias = await cache.getCached(key);
			expect(alias.statusCode).to.equal(301);
			expect(alias.props.redirect.name).to.equal(`rename-tests/${current}`);
			expect(alias.data).to.equal(undefined);
			expect(alias.parts).to.deep.equal([]);

			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}/resolved?specifier=release`);
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('release');
		});

		it('follows a cold first-page redirect using the same specifier under the new name', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/cold/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7002/tags?per_page=100' })
				.get('/repositories/7002').reply(200, { full_name: 'rename-tests/cold-current' }, { etag: '"cold-repo"' })
				.get('/repos/rename-tests/cold-current/tags').query({ per_page: 100 }).reply(200, [{ name: 'v2.3.4' }], {
					link: '<https://api.github.com/repos/rename-tests/cold-current/tags?per_page=100&page=11>; rel="last"',
				})
				.get(path => decodeURIComponent(path) === '/repos/rename-tests/cold-current/git/matching-refs/tags/2.3.4').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/2.3.4' }]);

			for (let repo of [ 'cold', 'cold-current', 'cold' ]) {
				let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${repo}/resolved?specifier=2.3.4`);
				expect(response).to.have.status(200);
				expect(response.body.version).to.equal('2.3.4');
			}

			let alias = await cache.getCached('https://api.github.com/repos/rename-tests/cold/tags?per_page=100');
			expect(alias.statusCode).to.equal(301);
			expect(alias.data).to.equal(undefined);
			expect(upstream.isDone()).to.be.true;
		});

		it('conditionally revalidates repository ID metadata after an hour', async () => {
			let { name, id, key } = await warmRename('conditional', 7003);
			await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			await redis.pExpire(`rrrc/pr/ghhttps://api.github.com/repositories/${id}`, oneMonth - 3 * 60 * 60 * 1000);
			let refresh = nock('https://api.github.com').get(`/repositories/${id}`)
				.matchHeader('if-none-match', `"repo-${id}"`).reply(304);

			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.include('1.2.3');
			expect(refresh.isDone()).to.be.true;
			let alias = await cache.getCached(key);
			expect(alias.isStale).to.be.false;
			expect(alias.headers.etag).to.equal(`"repo-${id}"`);
		});

		it('rebuilds a cold ID cache from an existing alias validator and a 304', async () => {
			let { name, id, key } = await warmRename('legacy-conditional', 7025);
			await cache.delete(`https://api.github.com/repositories/${id}`);
			await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			let upstream = nock('https://api.github.com').get(`/repositories/${id}`)
				.matchHeader('if-none-match', `"repo-${id}"`).reply(304);

			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}/resolved?specifier=release`);
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('release');
			expect(upstream.isDone()).to.be.true;

			let metadata = await cache.getCached(`https://api.github.com/repositories/${id}`);
			expect(metadata.statusCode).to.equal(200);
			expect(metadata.data.full_name).to.equal(`rename-tests/${name}-current`);
			expect((await cache.getCached(key)).isStale).to.be.false;
		});

		it('uses the updated name when repository metadata changes', async () => {
			let { name, id, key } = await warmRename('renamed-again', 7004);
			nock('https://api.github.com').get('/repos/rename-tests/newest/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'v3.0.0' }]);

			await chai.request(server).get('/v1/packages/gh/rename-tests/newest');
			await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			await redis.pExpire(`rrrc/pr/ghhttps://api.github.com/repositories/${id}`, oneMonth - 3 * 60 * 60 * 1000);

			let refresh = nock('https://api.github.com').get(`/repositories/${id}`)
				.matchHeader('if-none-match', `"repo-${id}"`)
				.reply(200, { full_name: 'rename-tests/newest' }, { etag: '"newest-repo"' });

			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}/resolved?specifier=^3`);
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('3.0.0');
			expect(refresh.isDone()).to.be.true;
		});

		it('retains a stale redirect when repository metadata temporarily fails', async () => {
			let { name, id, key } = await warmRename('metadata-error', 7005);
			await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			await redis.pExpire(`rrrc/pr/ghhttps://api.github.com/repositories/${id}`, oneMonth - 3 * 60 * 60 * 1000);
			let refresh = nock('https://api.github.com').get(`/repositories/${id}`).reply(503);

			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.include('1.2.3');
			expect(refresh.isDone()).to.be.true;
			expect((await cache.getCached(key)).statusCode).to.equal(301);
			expect(response.headers['cache-control']).to.match(/^public, max-age=10(?:,|$)/);

			let current = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}-current`);
			expect(current.headers['cache-control']).not.to.match(/^public, max-age=10(?:,|$)/);
		});

		it('rechecks the original name after an hour even when ID metadata is fresh', async () => {
			let { name, key } = await warmRename('reused', 7006);
			let keys = [ key, `https://api.github.com/repos/rename-tests/${name}/tags?per_page=100` ];

			for (let key of keys) {
				let redisKey = `rrrc/pr/gh${key}`;
				let entry = await PromiseCacheShared.parse(await redis.decompress(await redis.get(redisKey)));
				entry.v.props.redirect.checkedAt -= 65 * 60 * 1000;
				await redis.set(redisKey, await redis.compress(await PromiseCacheShared.serialize(entry)), { PX: oneMonth });
			}

			let upstream = nock('https://api.github.com').get(`/repos/rename-tests/${name}/tags`).query({ per_page: 100 })
				.reply(200, [{ name: 'v9.0.0' }]);
			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}/resolved?specifier=^9`);
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('9.0.0');
			expect(upstream.isDone()).to.be.true;
			expect((await cache.getCached(key)).statusCode).to.equal(200);
			expect((await cache.getCached(`/rename-tests/${name}-current`)).data).to.have.members([ '1.2.3', 'release' ]);
		});

		it('keeps an expired name mapping stale when its source cannot be checked', async () => {
			let { name, current, key } = await warmRename('source-check-error', 7034);

			for (let key of [ `/rename-tests/${name}`, `https://api.github.com/repos/rename-tests/${name}/tags?per_page=100` ]) {
				let redisKey = `rrrc/pr/gh${key}`;
				let entry = await PromiseCacheShared.parse(await redis.decompress(await redis.get(redisKey)));
				entry.v.props.redirect.checkedAt -= 65 * 60 * 1000;
				await redis.set(redisKey, await redis.compress(await PromiseCacheShared.serialize(entry)), { PX: oneMonth });
			}

			let upstream = nock('https://api.github.com').get(`/repos/rename-tests/${name}/tags`).query({ per_page: 100 }).twice().reply(503);

			for (let attempt = 0; attempt < 2; attempt++) {
				let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
				expect(response).to.have.status(200);
				expect(response.headers['cache-control']).to.match(/^public, max-age=10(?:,|$)/);
			}

			expect((await cache.getCached(key)).isStale).to.be.true;
			let target = await chai.request(server).get(`/v1/packages/gh/rename-tests/${current}`);
			expect(target.headers['cache-control']).not.to.match(/^public, max-age=10(?:,|$)/);
			expect(upstream.isDone()).to.be.true;
		});

		it('expires a prefix alias independently after the source name has been revived', async () => {
			let { name, current, key } = await warmRename('prefix-revival', 7035);
			let entry = await PromiseCacheShared.parse(await redis.decompress(await redis.get(`rrrc/pr/gh${key}`)));
			entry.v.props.redirect.checkedAt -= 65 * 60 * 1000;
			await redis.set(`rrrc/pr/ghhttps://api.github.com/repos/rename-tests/${name}/git/matching-refs/tags%2Frelease`, await redis.compress(await PromiseCacheShared.serialize(entry)), { PX: oneMonth - 15 * 60 * 1000 });

			for (let key of [ `/rename-tests/${name}`, `https://api.github.com/repos/rename-tests/${name}/tags?per_page=100` ]) {
				await redis.set(`rrrc/pr/gh${key}`, await redis.compress(await PromiseCacheShared.serialize(entry)), { PX: oneMonth });
			}

			let upstream = nock('https://api.github.com')
				.get(`/repos/rename-tests/${name}/tags`).query({ per_page: 100 }).reply(200, [{ name: 'replacement' }]);
			let replacement = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
			expect(replacement.body.versions.map(item => item.version)).to.deep.equal([ 'replacement' ]);
			await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 11 * 60 * 1000);

			for (let prefix of [ 'release', 'vrelease' ]) {
				upstream.get(path => decodeURIComponent(path) === `/repos/rename-tests/${name}/git/matching-refs/tags/${prefix}`).query({ per_page: 100 }).reply(200, []);
			}

			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}/resolved?specifier=release`);
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal(null);
			let target = await chai.request(server).get(`/v1/packages/gh/rename-tests/${current}/resolved?specifier=release`);
			expect(target.body.version).to.equal('release');
			expect((await cache.getCached(`/rename-tests/${current}`)).data).to.have.members([ '1.2.3', 'release' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('discovers redirects while conditionally refreshing an old listing', async () => {
			let setup = nock('https://api.github.com')
				.get('/repos/rename-tests/old-304/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'v1.0.0' }], { etag: '"old-tags"' })
				.get('/repos/rename-tests/new-304/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'v2.0.0' }]);

			for (let repo of [ 'old-304', 'new-304' ]) {
				await chai.request(server).get(`/v1/packages/gh/rename-tests/${repo}`);
			}

			for (let key of [ '/rename-tests/old-304', 'https://api.github.com/repos/rename-tests/old-304/tags?per_page=100' ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 25 * 60 * 1000);
			}

			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/old-304/tags').query({ per_page: 100 }).matchHeader('if-none-match', '"old-tags"')
				.reply(301, '', { location: 'https://api.github.com/repositories/7007/tags?per_page=100' })
				.get('/repositories/7007').reply(200, { full_name: 'rename-tests/new-304' }, { etag: '"repo-7007"' });
			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/old-304');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '2.0.0' ]);
			expect((await cache.getCached('/rename-tests/old-304')).statusCode).to.equal(301);
			expect(setup.isDone()).to.be.true;
			expect(upstream.isDone()).to.be.true;
		});

		it('reuses a canonical prefix cache after discovering a literal-ref redirect', async () => {
			let setup = nock('https://api.github.com')
				.get('/repos/rename-tests/prefix-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }])
				.get('/repos/rename-tests/prefix-new/tags').query({ per_page: 100 }).reply(200, [{ name: 'v2.0.0' }], {
					link: '<https://api.github.com/repos/rename-tests/prefix-new/tags?per_page=100&page=11>; rel="last"',
				})
				.get(path => decodeURIComponent(path) === '/repos/rename-tests/prefix-new/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/release' }]);
			await chai.request(server).get('/v1/packages/gh/rename-tests/prefix-old');
			await chai.request(server).get('/v1/packages/gh/rename-tests/prefix-new/resolved?specifier=release');
			await redis.pExpire('rrrc/pr/gh/rename-tests/prefix-old', oneMonth - 25 * 60 * 1000);

			let upstream = nock('https://api.github.com')
				.get(path => decodeURIComponent(path) === '/repos/rename-tests/prefix-old/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7008/git/matching-refs/tags/release?per_page=100' })
				.get('/repositories/7008').reply(200, { full_name: 'rename-tests/prefix-new' }, { etag: '"repo-7008"' });
			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/prefix-old/resolved?specifier=release');
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('release');
			let alias = await cache.getCached('https://api.github.com/repos/rename-tests/prefix-old/git/matching-refs/tags%2Frelease');
			expect(alias.statusCode).to.equal(301);
			expect(alias.data).to.equal(undefined);
			expect(setup.isDone()).to.be.true;
			expect(upstream.isDone()).to.be.true;
		});

		it('shares ID metadata across literal prefixes and reuses the complete canonical listing', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/shared-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }])
				.get('/repos/rename-tests/shared-new/tags').query({ per_page: 100 }).reply(200, [{ name: 'release' }, { name: 'stable' }])
				.get('/repositories/7017').reply(200, { full_name: 'rename-tests/shared-new' }, { etag: '"shared-repo"' });

			for (let repo of [ 'shared-old', 'shared-new' ]) {
				await chai.request(server).get(`/v1/packages/gh/rename-tests/${repo}`);
			}

			await redis.pExpire('rrrc/pr/gh/rename-tests/shared-old', oneMonth - 25 * 60 * 1000);

			for (let prefix of [ 'release', 'stable' ]) {
				upstream.get(path => decodeURIComponent(path) === `/repos/rename-tests/shared-old/git/matching-refs/tags/${prefix}`).query({ per_page: 100 })
					.reply(301, '', { location: `https://api.github.com/repositories/7017/git/matching-refs/tags/${prefix}` });

				let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/shared-old/resolved?specifier=${prefix}`);
				expect(response).to.have.status(200);
				expect(response.body.version).to.equal(prefix);
			}

			expect(upstream.isDone()).to.be.true;
		});

		it('bypasses a cached destination alias belonging to a different repository ID', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/identity-b/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7018/tags' })
				.get('/repositories/7018').reply(200, { full_name: 'rename-tests/identity-c' })
				.get('/repos/rename-tests/identity-c/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }]);
			await chai.request(server).get('/v1/packages/gh/rename-tests/identity-b');

			upstream.get('/repos/rename-tests/identity-a/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7019/tags' })
				.get('/repositories/7019').reply(200, { full_name: 'rename-tests/identity-b' })
				.get('/repos/rename-tests/identity-b/tags').query({ per_page: 100 }).reply(200, [{ name: 'v2.0.0' }]);

			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/identity-a');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '2.0.0' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('keeps a promoted first-page alias stale when ID revalidation fails', async () => {
			let { name, id, key } = await warmRename('promotion-error', 7020);
			await cache.delete(key);

			for (let key of [ `https://api.github.com/repos/rename-tests/${name}/tags?per_page=100`, `https://api.github.com/repositories/${id}` ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			}

			let upstream = nock('https://api.github.com').get(`/repositories/${id}`).times(2).reply(503);

			for (let attempt = 0; attempt < 2; attempt++) {
				let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
				expect(response).to.have.status(200);
				expect(response.headers['cache-control']).to.match(/^public, max-age=10(?:,|$)/);
			}

			expect((await cache.getCached(key)).isStale).to.be.true;
			expect(upstream.isDone()).to.be.true;
		});

		it('clears destination 404s when first discovering a rename', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/negative-new/tags').query({ per_page: 100 }).reply(404);
			let missing = await chai.request(server).get('/v1/packages/gh/rename-tests/negative-new');
			expect(missing).to.have.status(404);

			upstream.get('/repos/rename-tests/negative-old/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7021/tags' })
				.get('/repositories/7021').reply(200, { full_name: 'rename-tests/negative-new' })
				.get('/repos/rename-tests/negative-new/tags').query({ per_page: 100 }).reply(200, [{ name: 'v3.0.0' }]);

			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/negative-old');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '3.0.0' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('retains repository identity when a redirected specifier refreshes a complete listing', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/history-b/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }])
				.get('/repos/rename-tests/history-c/tags').query({ per_page: 100 }).reply(200, [{ name: 'v9.0.0' }]);

			for (let repo of [ 'history-b', 'history-c' ]) {
				await chai.request(server).get(`/v1/packages/gh/rename-tests/${repo}`);
			}

			for (let key of [ '/rename-tests/history-b', 'https://api.github.com/repos/rename-tests/history-b/tags?per_page=100' ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 25 * 60 * 1000);
			}

			upstream.get('/repos/rename-tests/history-a/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7022/tags' })
				.get('/repositories/7022').reply(200, { full_name: 'rename-tests/history-b' })
				.get('/repos/rename-tests/history-b/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7023/tags' })
				.get('/repositories/7023').reply(200, { full_name: 'rename-tests/history-c' })
				.get('/repos/rename-tests/history-b/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.1.0' }]);

			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/history-a/resolved?specifier=^1');
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('1.1.0');
			expect(upstream.isDone()).to.be.true;
		});

		it('uses the source stale listing when a redirected literal lookup fails', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/fallback-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'release' }]);
			await chai.request(server).get('/v1/packages/gh/rename-tests/fallback-old');
			await redis.pExpire('rrrc/pr/gh/rename-tests/fallback-old', oneMonth - 25 * 60 * 1000);

			upstream.get(path => decodeURIComponent(path) === '/repos/rename-tests/fallback-old/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7024/git/matching-refs/tags/release' })
				.get('/repositories/7024').reply(200, { full_name: 'rename-tests/fallback-new' })
				.get('/repos/rename-tests/fallback-new/tags').query({ per_page: 100 }).reply(503);

			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/fallback-old/resolved?specifier=release');
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('release');
			expect(response.headers['cache-control']).to.match(/^public, max-age=10(?:,|$)/);
			expect(upstream.isDone()).to.be.true;
		});

		for (let [ paginationRedirect, staleCanonical ] of [ [ false, false ], [ false, true ], [ true, false ] ]) {
			it(`preserves the specifier when a ${paginationRedirect ? 'later page' : 'full-list refresh'} discovers a rename${staleCanonical ? ' with stale canonical prefixes' : ''}`, async () => {
				let old = paginationRedirect ? 'range-page-old' : staleCanonical ? 'range-stale-old' : 'range-old';
				let current = `${old}-current`;
				let id = paginationRedirect ? 7027 : staleCanonical ? 7033 : 7026;
				let upstream = nock('https://api.github.com')
					.get(`/repos/rename-tests/${current}/tags`).query({ per_page: 100 }).reply(200, [{ name: 'v1.2.3' }], {
						link: `<https://api.github.com/repos/rename-tests/${current}/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/rename-tests/${current}/tags?per_page=100&page=11>; rel="last"`,
					})
					.get(path => decodeURIComponent(path) === `/repos/rename-tests/${current}/git/matching-refs/tags/1`).query({ per_page: 100 })
					.reply(200, [{ ref: 'refs/tags/1.2.3' }])
					.get(path => decodeURIComponent(path) === `/repos/rename-tests/${current}/git/matching-refs/tags/v1`).query({ per_page: 100 }).reply(200, [])
					.get(`/repos/rename-tests/${old}/tags`).query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }], paginationRedirect ? {
						link: `<https://api.github.com/repos/rename-tests/${old}/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/rename-tests/${old}/tags?per_page=100&page=2>; rel="last"`,
					} : {});
				await chai.request(server).get(`/v1/packages/gh/rename-tests/${current}/resolved?specifier=^1`);

				if (staleCanonical) {
					for (let prefix of [ '1', 'v1' ]) {
						await redis.pExpire(`rrrc/pr/ghhttps://api.github.com/repos/rename-tests/${current}/git/matching-refs/tags%2F${prefix}`, oneMonth - 25 * 60 * 1000);
						upstream.get(path => decodeURIComponent(path) === `/repos/rename-tests/${current}/git/matching-refs/tags/${prefix}`).query({ per_page: 100 }).reply(503);
					}
				}

				if (!paginationRedirect) {
					await chai.request(server).get(`/v1/packages/gh/rename-tests/${old}`);

					for (let key of [ `/rename-tests/${old}`, `https://api.github.com/repos/rename-tests/${old}/tags?per_page=100` ]) {
						await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 25 * 60 * 1000);
					}
				}

				upstream.get(`/repos/rename-tests/${old}/tags`).query(paginationRedirect ? { per_page: 100, page: 2 } : { per_page: 100 })
					.reply(301, '', { location: `https://api.github.com/repositories/${id}/tags` })
					.get(`/repositories/${id}`).reply(200, { full_name: `rename-tests/${current}` });

				let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${old}/resolved?specifier=^1`);
				expect(response).to.have.status(200);
				expect(response.body.version).to.equal('1.2.3');
				expect(upstream.isDone()).to.be.true;
			});
		}

		it('uses the source literal when canonical cached misses cannot be revalidated', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/stale-miss-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'release' }])
				.get('/repos/rename-tests/stale-miss-current/tags').query({ per_page: 100 }).reply(200, [{ name: 'other' }], {
					link: '<https://api.github.com/repos/rename-tests/stale-miss-current/tags?per_page=100&page=11>; rel="last"',
				});
			await chai.request(server).get('/v1/packages/gh/rename-tests/stale-miss-old');

			for (let prefix of [ 'release', 'vrelease' ]) {
				upstream.get(path => decodeURIComponent(path) === `/repos/rename-tests/stale-miss-current/git/matching-refs/tags/${prefix}`).query({ per_page: 100 }).reply(200, []);
			}

			let freshMiss = await chai.request(server).get('/v1/packages/gh/rename-tests/stale-miss-current/resolved?specifier=release');
			expect(freshMiss.body.version).to.equal(null);
			await redis.pExpire('rrrc/pr/gh/rename-tests/stale-miss-old', oneMonth - 25 * 60 * 1000);

			upstream.get(path => decodeURIComponent(path) === '/repos/rename-tests/stale-miss-old/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7028/git/matching-refs/tags/release' })
				.get('/repositories/7028').reply(200, { full_name: 'rename-tests/stale-miss-current' });

			let renamedFreshMiss = await chai.request(server).get('/v1/packages/gh/rename-tests/stale-miss-old/resolved?specifier=release');
			expect(renamedFreshMiss.body.version).to.equal(null);

			for (let prefix of [ 'release', 'vrelease' ]) {
				await redis.pExpire(`rrrc/pr/ghhttps://api.github.com/repos/rename-tests/stale-miss-current/git/matching-refs/tags%2F${prefix}`, oneMonth - 25 * 60 * 1000);
				upstream.get(path => decodeURIComponent(path) === `/repos/rename-tests/stale-miss-current/git/matching-refs/tags/${prefix}`).query({ per_page: 100 }).reply(503);
			}

			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/stale-miss-old/resolved?specifier=release');
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('release');
			expect(response.headers['cache-control']).to.match(/^public, max-age=10(?:,|$)/);
			expect(upstream.isDone()).to.be.true;
		});

		it('clears destination negatives when a known alias changes its target', async () => {
			let { name, id, key } = await warmRename('negative-again', 7029);
			let upstream = nock('https://api.github.com').get('/repos/rename-tests/negative-latest/tags').query({ per_page: 100 }).reply(404);
			let missing = await chai.request(server).get('/v1/packages/gh/rename-tests/negative-latest');
			expect(missing).to.have.status(404);

			for (let key of [ `/rename-tests/${name}`, `https://api.github.com/repositories/${id}` ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			}

			upstream.get(`/repositories/${id}`).reply(200, { full_name: 'rename-tests/negative-latest' })
				.get('/repos/rename-tests/negative-latest/tags').query({ per_page: 100 }).reply(200, [{ name: 'v8.0.0' }]);

			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '8.0.0' ]);
			expect((await cache.getCached(key)).props.redirect.name).to.equal('rename-tests/negative-latest');
			expect(upstream.isDone()).to.be.true;
		});

		it('retains fresh destination negatives when an hourly source check confirms the same target with different casing', async () => {
			let { name, current, id } = await warmRename('unchanged-negative', 7036);
			await cache.delete(`/rename-tests/${current}`);
			await cache.delete(`https://api.github.com/repos/rename-tests/${current}/tags?per_page=100`);
			let upstream = nock('https://api.github.com').get(`/repos/rename-tests/${current}/tags`).query({ per_page: 100 }).reply(404);
			await chai.request(server).get(`/v1/packages/gh/rename-tests/${current}`);

			for (let key of [ `/rename-tests/${name}`, `https://api.github.com/repos/rename-tests/${name}/tags?per_page=100` ]) {
				let redisKey = `rrrc/pr/gh${key}`;
				let entry = await PromiseCacheShared.parse(await redis.decompress(await redis.get(redisKey)));
				entry.v.props.redirect.name = entry.v.props.redirect.name.toUpperCase();
				entry.v.props.redirect.checkedAt -= 65 * 60 * 1000;
				await redis.set(redisKey, await redis.compress(await PromiseCacheShared.serialize(entry)), { PX: oneMonth });
			}

			upstream.get(`/repos/rename-tests/${name}/tags`).query({ per_page: 100 }).reply(301, '', { location: `https://api.github.com/repositories/${id}/tags` });
			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
			expect(response).to.have.status(404);
			expect((await cache.getCached(`/rename-tests/${current}`)).statusCode).to.equal(404);
			expect((await cache.getCached(`https://api.github.com/repos/rename-tests/${current}/tags?per_page=100`)).statusCode).to.equal(404);
			expect(upstream.isDone()).to.be.true;
		});

		it('keeps a fresh canonical miss authoritative when only alias validation fails', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/fresh-miss-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'release' }])
				.get('/repos/rename-tests/fresh-miss-current/tags').query({ per_page: 100 }).reply(200, [{ name: 'other' }]);

			for (let repo of [ 'fresh-miss-old', 'fresh-miss-current' ]) {
				await chai.request(server).get(`/v1/packages/gh/rename-tests/${repo}`);
			}

			await redis.pExpire('rrrc/pr/gh/rename-tests/fresh-miss-old', oneMonth - 25 * 60 * 1000);

			upstream.get(path => decodeURIComponent(path) === '/repos/rename-tests/fresh-miss-old/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7037/git/matching-refs/tags/release' })
				.get('/repositories/7037').reply(200, { full_name: 'rename-tests/fresh-miss-current' });

			let initial = await chai.request(server).get('/v1/packages/gh/rename-tests/fresh-miss-old/resolved?specifier=release');
			expect(initial.body.version).to.equal(null);
			let redisKey = 'rrrc/pr/ghhttps://api.github.com/repos/rename-tests/fresh-miss-old/git/matching-refs/tags%2Frelease';
			let entry = await PromiseCacheShared.parse(await redis.decompress(await redis.get(redisKey)));
			entry.v.props.redirect.checkedAt -= 65 * 60 * 1000;
			await redis.set(redisKey, await redis.compress(await PromiseCacheShared.serialize(entry)), { PX: oneMonth - 15 * 60 * 1000 });
			upstream.get(path => decodeURIComponent(path) === '/repos/rename-tests/fresh-miss-old/git/matching-refs/tags/release').query({ per_page: 100 }).reply(503);
			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/fresh-miss-old/resolved?specifier=release');
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal(null);
			expect(response.headers['cache-control']).to.match(/^public, max-age=10(?:,|$)/);
			expect((await cache.getCached('/rename-tests/fresh-miss-current')).data).to.deep.equal([ 'other' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('keeps target caches correct when a fresh alias still names a revived repository', async () => {
			let { name, current, key } = await warmRename('target-ownership', 7030);
			await cache.delete(`/rename-tests/${current}`);
			await cache.delete(`https://api.github.com/repos/rename-tests/${current}/tags?per_page=100`);
			let upstream = nock('https://api.github.com')
				.get(`/repos/rename-tests/${current}/tags`).query({ per_page: 100 }).reply(200, [{ name: 'replacement' }])
				.get('/repos/rename-tests/ownership-actual/tags').query({ per_page: 100 }).reply(200, [{ name: 'original' }]);

			for (let [ repo, version ] of [ [ name, 'replacement' ], [ current, 'replacement' ], [ 'ownership-actual', 'original' ] ]) {
				let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${repo}`);
				expect(response).to.have.status(200);
				expect(response.body.versions.map(item => item.version)).to.deep.equal([ version ]);
			}

			expect((await cache.getCached(`/rename-tests/${current}`)).data).to.deep.equal([ 'replacement' ]);
			expect((await cache.getCached('/rename-tests/ownership-actual')).data).to.deep.equal([ 'original' ]);
			expect((await cache.getCached(key)).data).to.equal(undefined);
			expect(upstream.isDone()).to.be.true;
		});

		it('stops retrying a live conflicting ID after bypassing its cached alias', async () => {
			let { name, current } = await warmRename('live-conflict', 7031);
			await cache.delete(`/rename-tests/${current}`);
			await cache.delete(`https://api.github.com/repos/rename-tests/${current}/tags?per_page=100`);
			let upstream = nock('https://api.github.com')
				.get(`/repos/rename-tests/${current}/tags`).query({ per_page: 100 }).twice().delay(40)
				.reply(301, '', { location: 'https://api.github.com/repositories/7032/tags' })
				.get('/repositories/7032').reply(200, { full_name: 'rename-tests/conflict-other' });
			let service = new GitHubRemoteService({ baseUrl: 'https://api.github.com' }, cache);
			let failure = await service.listTags('rename-tests', name).catch(error => error);
			expect(failure.statusCode).to.equal(502);
			expect(failure.error.message).to.equal('GitHub repository redirect loop.');
			expect(upstream.isDone()).to.be.true;
		});

		it('rejects cached redirect cycles', async () => {
			let requests = 0;

			for (let [ source, target, id ] of [ [ 'a', 'b', 7009 ], [ 'b', 'a', 7014 ] ]) {
				nock('https://api.github.com').get(`/repos/loop-bound/${source}/tags`).query({ per_page: 100 }).times(3)
					.reply(() => {
						requests++;
						return [ 301, '', { location: `https://api.github.com/repositories/${id}/tags?per_page=100` }];
					})
					.get(`/repositories/${id}`).times(3).reply(200, { full_name: `loop-bound/${target}` });
			}

			let service = new GitHubRemoteService({ baseUrl: 'https://api.github.com' }, cache);
			let failure = await service.listTags('loop-bound', 'a').catch(error => error);
			expect(failure.statusCode).to.equal(502);
			expect(failure.error.message).to.equal('GitHub repository redirect loop.');
			expect(requests).to.be.at.most(6);
		});

		it('does not copy an old listing into a cold canonical cache during an outage', async () => {
			let setup = nock('https://api.github.com')
				.get('/repos/rename-tests/outage-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }]);
			await chai.request(server).get('/v1/packages/gh/rename-tests/outage-old');

			for (let key of [ '/rename-tests/outage-old', 'https://api.github.com/repos/rename-tests/outage-old/tags?per_page=100' ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 25 * 60 * 1000);
			}

			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/outage-old/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7010/tags?per_page=100' })
				.get('/repositories/7010').reply(200, { full_name: 'rename-tests/outage-new' }, { etag: '"repo-7010"' })
				.get('/repos/rename-tests/outage-new/tags').query({ per_page: 100 }).times(3).reply(503);

			let responses = [];

			for (let attempt = 0; attempt < 2; attempt++) {
				responses.push(await chai.request(server).get('/v1/packages/gh/rename-tests/outage-old'));
			}

			expect(responses.map(response => response.status)).to.deep.equal([ 500, 500 ]);
			let direct = await chai.request(server).get('/v1/packages/gh/rename-tests/outage-new');
			expect(direct).to.have.status(500);
			expect(await cache.getCached('/rename-tests/outage-new')).to.equal(null);
			expect((await cache.getCached('/rename-tests/outage-old')).data).to.equal(undefined);
			expect(setup.isDone()).to.be.true;
			expect(upstream.isDone()).to.be.true;
		});

		it('recovers when a repository is renamed back while an earlier alias is fresh', async () => {
			let { name, current, key } = await warmRename('rename-back', 7011);
			let entry = await PromiseCacheShared.parse(await redis.decompress(await redis.get(`rrrc/pr/gh${key}`)));
			entry.v.props.redirect.name = `rename-tests/${name}`;
			entry.v.props.redirect.source = `rename-tests/${current}`;
			await redis.set(`rrrc/pr/gh/rename-tests/${current}`, await redis.compress(await PromiseCacheShared.serialize(entry)), { PX: oneMonth });

			let upstream = nock('https://api.github.com').get(`/repos/rename-tests/${name}/tags`).query({ per_page: 100 })
				.reply(200, [{ name: 'v4.0.0' }]);
			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '4.0.0' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('resolves a recognized redirect before fetching its numeric tag endpoint', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/manual-new/tags').query({ per_page: 100 }).reply(200, [{ name: 'v5.0.0' }])
				.get('/repos/rename-tests/manual-old/tags').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7012/tags?per_page=100' })
				.get('/repositories/7012').reply(200, { full_name: 'rename-tests/manual-new' }, { etag: '"repo-7012"' });
			await chai.request(server).get('/v1/packages/gh/rename-tests/manual-new');
			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/manual-old');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '5.0.0' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('retains ordinary redirect handling without forwarding authentication to another origin', async () => {
			let upstream = nock('https://api.github.com').get('/repos/rename-tests/temporary/tags').query({ per_page: 100 })
				.times(2).reply(302, '', { location: 'https://redirect.example.test/tags?per_page=100' });
			let destination = nock('https://redirect.example.test').get('/tags').query({ per_page: 100 })
				.matchHeader('authorization', value => value === undefined).reply(200, [{ name: 'v6.0.0' }]);
			let service = new GitHubRemoteService({ baseUrl: 'https://api.github.com', auth: 'token harmless-test-token' }, cache);
			let response = await service.request('/repos/rename-tests/temporary/tags', { per_page: 100 });
			expect(response.data).to.deep.equal([{ name: 'v6.0.0' }]);
			expect(response.props.redirect).to.equal(undefined);
			expect(upstream.isDone()).to.be.true;
			expect(destination.isDone()).to.be.true;
		});

		it('checks the original name when the previously redirected repository ID disappears', async () => {
			let { name, key, id } = await warmRename('missing-id', 7013);

			for (let key of [ `/rename-tests/${name}`, `https://api.github.com/repos/rename-tests/${name}/tags?per_page=100` ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			}

			await redis.pExpire(`rrrc/pr/ghhttps://api.github.com/repositories/${id}`, oneMonth - 3 * 60 * 60 * 1000);

			let upstream = nock('https://api.github.com').get(`/repositories/${id}`).reply(404)
				.get(`/repos/rename-tests/${name}/tags`).query({ per_page: 100 }).reply(200, [{ name: 'v7.0.0' }]);
			let response = await chai.request(server).get(`/v1/packages/gh/rename-tests/${name}`);
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '7.0.0' ]);
			expect((await cache.getCached(key)).statusCode).to.equal(200);
			expect(upstream.isDone()).to.be.true;
		});

		it('fetches a cold canonical listing without the old name\'s validators or pagination', async () => {
			let setup = nock('https://api.github.com')
				.get('/repos/rename-tests/pages-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'v1.0.0' }], {
					etag: '"rename-page-one"',
					link: '<https://api.github.com/repos/rename-tests/pages-old/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/rename-tests/pages-old/tags?per_page=100&page=2>; rel="last"',
				})
				.get('/repos/rename-tests/pages-old/tags').query({ per_page: 100, page: 2 })
				.reply(200, [{ name: 'v0.9.0' }], { etag: '"rename-page-two"' });
			await chai.request(server).get('/v1/packages/gh/rename-tests/pages-old');

			for (let key of [ '/rename-tests/pages-old', 'https://api.github.com/repos/rename-tests/pages-old/tags?per_page=100' ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 25 * 60 * 1000);
			}

			let upstream = nock('https://api.github.com')
				.get('/repos/rename-tests/pages-old/tags').query({ per_page: 100 }).matchHeader('if-none-match', '"rename-page-one"')
				.reply(301, '', { location: 'https://api.github.com/repositories/7015/tags?per_page=100' })
				.get('/repositories/7015').reply(200, { full_name: 'rename-tests/pages-new' })
				.get('/repos/rename-tests/pages-new/tags').query({ per_page: 100 }).matchHeader('if-none-match', value => value === undefined)
				.reply(200, [{ name: 'v2.0.0' }], { link: '<https://api.github.com/repos/rename-tests/pages-new/tags?per_page=100&page=2>; rel="next"' })
				.get('/repos/rename-tests/pages-new/tags').query({ per_page: 100, page: 2 }).matchHeader('if-none-match', value => value === undefined)
				.reply(200, [{ name: 'v1.5.0' }]);
			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/pages-old');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '2.0.0', '1.5.0' ]);
			expect((await cache.getCached('/rename-tests/pages-new')).parts[0].props.next).to.include('/repos/rename-tests/pages-new/');
			expect(setup.isDone()).to.be.true;
			expect(upstream.isDone()).to.be.true;
		});

		it('preserves stale alias status when merging multiple prefix responses', async () => {
			let setup = nock('https://api.github.com')
				.get('/repos/rename-tests/merge-old/tags').query({ per_page: 100 }).reply(200, [{ name: 'v2.2.0' }], {
					link: '<https://api.github.com/repos/rename-tests/merge-old/tags?per_page=100&page=11>; rel="last"',
				})
				.get(path => decodeURIComponent(path) === '/repos/rename-tests/merge-old/git/matching-refs/tags/2').query({ per_page: 100 })
				.reply(301, '', { location: 'https://api.github.com/repositories/7016/git/matching-refs/tags/2?per_page=100' })
				.get('/repositories/7016').reply(200, { full_name: 'rename-tests/merge-new' }, { etag: '"merge-repo"' })
				.get('/repos/rename-tests/merge-new/tags').query({ per_page: 100 }).reply(200, [{ name: 'v2.2.0' }], {
					link: '<https://api.github.com/repos/rename-tests/merge-new/tags?per_page=100&page=11>; rel="last"',
				});

			for (let prefix of [ '2', 'v2' ]) {
				setup.get(path => decodeURIComponent(path) === `/repos/rename-tests/merge-new/git/matching-refs/tags/${prefix}`).query({ per_page: 100 })
					.reply(200, [{ ref: `refs/tags/${prefix === '2' ? '2.1.0' : 'v2.2.0'}` }]);
			}

			await chai.request(server).get('/v1/packages/gh/rename-tests/merge-old/resolved?specifier=^2');

			for (let key of [ 'https://api.github.com/repos/rename-tests/merge-old/git/matching-refs/tags%2F2', 'https://api.github.com/repositories/7016' ]) {
				await redis.pExpire(`rrrc/pr/gh${key}`, oneMonth - 3 * 60 * 60 * 1000);
			}

			let upstream = nock('https://api.github.com').get('/repositories/7016').reply(503);
			let response = await chai.request(server).get('/v1/packages/gh/rename-tests/merge-old/resolved?specifier=^2');
			expect(response).to.have.status(200);
			expect(response.body.version).to.equal('2.2.0');
			expect(response.headers['cache-control']).to.match(/^public, max-age=10(?:,|$)/);
			expect(setup.isDone()).to.be.true;
			expect(upstream.isDone()).to.be.true;
		});
	});

	describe('GitHub first-page cache', () => {
		it('enumerates a small repository once and reuses it across specifiers', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/page-tests/small/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'v1.2.3' }, { name: 'v1.3.0' }]);

			for (let [ specifier, version ] of [ [ '1.2.3', '1.2.3' ], [ '^1', '1.3.0' ] ]) {
				let response = await chai.request(server).get('/v1/packages/gh/page-tests/small/resolved').query({ specifier });
				expect(response).to.have.status(200);
				expect(response.body).to.include({ version });
			}

			let metadata = await chai.request(server).get('/v1/packages/gh/page-tests/small');
			expect(metadata).to.have.status(200);
			expect(metadata.body.versions.map(item => item.version)).to.deep.equal([ '1.3.0', '1.2.3' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('enumerates all ten pages without requesting the first page twice', async () => {
			let upstream = nock('https://api.github.com');

			for (let page = 1; page <= 10; page++) {
				let next = page < 10 ? `<https://api.github.com/repos/page-tests/ten/tags?per_page=100&page=${page + 1}>; rel="next", ` : '';
				upstream.get('/repos/page-tests/ten/tags').query(page === 1 ? { per_page: 100 } : { per_page: 100, page })
					.reply(200, [{ name: `1.${page}.0` }], { link: `${next}<https://api.github.com/repos/page-tests/ten/tags?per_page=100&page=10>; rel="last"` });
			}

			let response = await chai.request(server).get('/v1/packages/gh/page-tests/ten/resolved?specifier=^1');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: '1.10.0' });
			expect(upstream.isDone()).to.be.true;
		});

		it('reuses a large repository first page when later listing every tag', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/page-tests/large/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'v2.0.0' }], {
					etag: '"large-page-one"',
					link: '<https://api.github.com/repos/page-tests/large/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/page-tests/large/tags?per_page=100&page=11>; rel="last"',
				})
				.get(path => decodeURIComponent(path) === '/repos/page-tests/large/git/matching-refs/tags/1.2.3').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/1.2.3' }])
				.get(path => decodeURIComponent(path) === '/repos/page-tests/large/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/release' }]);

			for (let specifier of [ '1.2.3', 'release' ]) {
				let response = await chai.request(server).get('/v1/packages/gh/page-tests/large/resolved').query({ specifier });
				expect(response).to.have.status(200);
				expect(response.body).to.include({ version: specifier });
			}

			for (let page = 2; page <= 11; page++) {
				upstream.get('/repos/page-tests/large/tags').query({ per_page: 100, page })
					.reply(200, [{ name: `1.${page}.0` }], page < 11 ? { link: `<https://api.github.com/repos/page-tests/large/tags?per_page=100&page=${page + 1}>; rel="next"` } : {});
			}

			let metadata = await chai.request(server).get('/v1/packages/gh/page-tests/large');
			expect(metadata).to.have.status(200);
			expect(metadata.body.versions).to.have.lengthOf(11);
			expect(metadata.body.versions.map(item => item.version)).to.include('1.11.0');
			expect(upstream.isDone()).to.be.true;
		});

		it('enumerates when the last-page count is unavailable', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/page-tests/unknown/tags').query({ per_page: 100 })
				.reply(200, [{ name: '1.0.0' }], { link: '<https://api.github.com/repos/page-tests/unknown/tags?per_page=100&page=2>; rel="next"' })
				.get('/repos/page-tests/unknown/tags').query({ per_page: 100, page: 2 })
				.reply(200, [{ name: '1.9.0' }]);
			let response = await chai.request(server).get('/v1/packages/gh/page-tests/unknown/resolved?specifier=^1');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: '1.9.0' });
			expect(upstream.isDone()).to.be.true;
		});

		it('uses default cache lifetimes when assembling from a cached first page', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/page-tests/age/tags').query({ per_page: 100 })
				.reply(200, [{ name: '2.0.0' }], { link: '<https://api.github.com/repos/page-tests/age/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/page-tests/age/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path) === '/repos/page-tests/age/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/release' }]);
			let resolved = await chai.request(server).get('/v1/packages/gh/page-tests/age/resolved?specifier=release');
			expect(resolved).to.have.status(200);
			let pageKey = 'rrrc/pr/ghhttps://api.github.com/repos/page-tests/age/tags?per_page=100';
			expect(await redis.pExpire(pageKey, (30 * 24 * 60 - 8) * 60 * 1000)).to.equal(1);
			upstream.get('/repos/page-tests/age/tags').query({ per_page: 100, page: 2 }).reply(200, [{ name: '1.0.0' }]);
			let metadata = await chai.request(server).get('/v1/packages/gh/page-tests/age');
			expect(metadata).to.have.status(200);
			expect(metadata.body.versions.map(item => item.version)).to.deep.equal([ '2.0.0', '1.0.0' ]);
			let cache = new RedisRemoteResourceCache('pr/gh');
			let resource = await cache.getCached('/page-tests/age');
			expect(resource.ttlInternalRevalidate).to.equal(10 * 60 * 1000);
			expect(resource.ttlInternalStore).to.equal(30 * 24 * 60 * 60 * 1000);
			expect(resource.staleWhileRevalidate).to.equal(20 * 60 * 1000);
			expect(resource.isStale).to.be.false;
			await redis.pExpire('rrrc/pr/gh/page-tests/age', resource.ttlInternalStore - 11 * 60 * 1000);
			resource = await cache.getCached('/page-tests/age');
			expect(resource.isStale).to.be.true;
			expect(resource.age).to.be.below(resource.staleWhileRevalidate);
			expect(upstream.isDone()).to.be.true;
		});

		it('revalidates later pages even when the first page is unchanged', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/page-tests/revalidate/tags').query({ per_page: 100 })
				.reply(200, [{ name: '2.0.0' }], { etag: '"page-one"', link: '<https://api.github.com/repos/page-tests/revalidate/tags?per_page=100&page=2>; rel="next"' })
				.get('/repos/page-tests/revalidate/tags').query({ per_page: 100, page: 2 })
				.reply(200, [{ name: '1.0.0' }], { etag: '"page-two"' });
			let first = await chai.request(server).get('/v1/packages/gh/page-tests/revalidate');
			expect(first).to.have.status(200);
			expect(upstream.isDone()).to.be.true;
			let keys = await redis.keys('rrrc/pr/gh*page-tests/revalidate*');
			expect(keys).to.have.lengthOf(2);
			await Promise.all(keys.map(key => redis.pExpire(key, (30 * 24 * 60 - 25) * 60 * 1000)));

			let refresh = nock('https://api.github.com')
				.get('/repos/page-tests/revalidate/tags').query({ per_page: 100 }).matchHeader('if-none-match', '"page-one"').reply(304)
				.get('/repos/page-tests/revalidate/tags').query({ per_page: 100, page: 2 }).matchHeader('if-none-match', '"page-two"')
				.reply(200, [{ name: '1.9.0' }], { etag: '"page-two-updated"' });
			let response = await chai.request(server).get('/v1/packages/gh/page-tests/revalidate');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '2.0.0', '1.9.0' ]);
			expect(refresh.isDone()).to.be.true;
		});

		it('uses an existing complete list ETag when the first-page entry is absent', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/page-tests/legacy/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'v1.0.0' }], { etag: '"legacy-first-page"' });
			let first = await chai.request(server).get('/v1/packages/gh/page-tests/legacy');
			expect(first).to.have.status(200);
			expect(upstream.isDone()).to.be.true;
			await redis.del('rrrc/pr/ghhttps://api.github.com/repos/page-tests/legacy/tags?per_page=100');
			await redis.pExpire('rrrc/pr/gh/page-tests/legacy', (30 * 24 * 60 - 25) * 60 * 1000);
			let refresh = nock('https://api.github.com').get('/repos/page-tests/legacy/tags').query({ per_page: 100 })
				.matchHeader('if-none-match', '"legacy-first-page"').reply(304);
			let response = await chai.request(server).get('/v1/packages/gh/page-tests/legacy');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '1.0.0' ]);
			expect(refresh.isDone()).to.be.true;
		});

		it('waits for a stale first-page refresh before caching a new complete list', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/page-tests/swr/tags').query({ per_page: 100 })
				.reply(200, [{ name: '2.0.0' }], { etag: '"swr-page"', link: '<https://api.github.com/repos/page-tests/swr/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/page-tests/swr/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path) === '/repos/page-tests/swr/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/release' }]);
			let resolved = await chai.request(server).get('/v1/packages/gh/page-tests/swr/resolved?specifier=release');
			expect(resolved).to.have.status(200);
			expect(upstream.isDone()).to.be.true;
			await redis.pExpire('rrrc/pr/ghhttps://api.github.com/repos/page-tests/swr/tags?per_page=100', (30 * 24 * 60 - 11) * 60 * 1000);
			let refresh = nock('https://api.github.com')
				.get('/repos/page-tests/swr/tags').query({ per_page: 100 }).matchHeader('if-none-match', '"swr-page"').delay(30)
				.reply(200, [{ name: '3.0.0' }], { link: '<https://api.github.com/repos/page-tests/swr/tags?per_page=100&page=2>; rel="next"' })
				.get('/repos/page-tests/swr/tags').query({ per_page: 100, page: 2 }).reply(200, [{ name: '1.0.0' }]);
			let response = await chai.request(server).get('/v1/packages/gh/page-tests/swr');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.deep.equal([ '3.0.0', '1.0.0' ]);
			expect(refresh.isDone()).to.be.true;
		});
	});

	describe('GitHub semver eligibility', () => {
		it('excludes double-v tags from a cold small-repository resolution without changing metadata', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/eligibility-tests/cold/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'vv1.9.0' }, { name: 'v1.2.0' }]);
			let response = await chai.request(server).get('/v1/packages/gh/eligibility-tests/cold/resolved?specifier=^1');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: '1.2.0' });
			let metadata = await chai.request(server).get('/v1/packages/gh/eligibility-tests/cold');
			expect(metadata).to.have.status(200);
			expect(metadata.body.versions.map(item => item.version)).to.have.members([ 'v1.9.0', '1.2.0' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('applies eligibility to cached complete lists while preserving exact and escaped names', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/eligibility-tests/cached/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'vv1.9.0' }, { name: '1.2.0' }]);
			let metadata = await chai.request(server).get('/v1/packages/gh/eligibility-tests/cached');
			expect(metadata).to.have.status(200);
			expect(metadata.body.versions.map(item => item.version)).to.have.members([ 'v1.9.0', '1.2.0' ]);

			for (let [ specifier, version ] of [ [ '1.9.0', null ], [ '^1', '1.2.0' ], [ '>=1', '1.2.0' ], [ 'latest', '1.2.0' ], [ '*', '1.2.0' ], [ 'v1.9.0', 'v1.9.0' ] ]) {
				let response = await chai.request(server).get('/v1/packages/gh/eligibility-tests/cached/resolved').query({ specifier });
				expect(response).to.have.status(200);
				expect(response.body).to.include({ version });
			}

			let escaped = await chai.request(server).get('/v1/package/resolve/gh/eligibility-tests/cached@vv1.9.0');
			expect(escaped).to.have.status(200);
			expect(escaped.body).to.include({ version: 'v1.9.0' });
			let unchanged = await chai.request(server).get('/v1/packages/gh/eligibility-tests/cached');
			expect(unchanged).to.have.status(200);
			expect(unchanged.body).to.deep.equal(metadata.body);
			expect(upstream.isDone()).to.be.true;
		});

		it('returns no latest version when only a double-v tag exists', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/eligibility-tests/only-double-v/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'vv1.9.0' }]);
			let response = await chai.request(server).get('/v1/packages/gh/eligibility-tests/only-double-v/resolved');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: null });
			expect(upstream.isDone()).to.be.true;
		});
	});

	describe('GitHub prefix resolution', () => {
		[
			{ name: 'literal', specifier: 'cve_2026-10-15_2000Z', tags: [ 'cve_2026-10-15_2000Z', 'cve_2026-10-15_2000Z-extra' ], prefixes: [ 'cve_2026-10-15_2000Z' ], version: 'cve_2026-10-15_2000Z' },
			{ name: 'leading-v', specifier: 'release', tags: [ 'vrelease' ], prefixes: [ 'release', 'vrelease' ], version: 'release' },
			{ name: 'four-components', specifier: '83.0.4100.0', tags: [ '83.0.4100.0' ], prefixes: [ '83.0.4100.0' ], version: '83.0.4100.0' },
			{ name: 'build-fallback', specifier: '1.2.3', tags: [ 'v1.2.3+buildA', 'v1.2.3+buildB', '1.2.3-beta.1' ], prefixes: [ '1.2.3', 'v1.2.3' ], version: '1.2.3+buildB' },
			{ name: 'exact-build', specifier: '1.2.3+buildA', tags: [ '1.2.3+buildA', '1.2.3+buildB' ], prefixes: [ '1.2.3' ], version: '1.2.3+buildA' },
			{ name: 'prerelease', specifier: '1.2.3-beta.1', tags: [ 'v1.2.3-beta.1+buildA', '1.2.3' ], prefixes: [ '1.2.3', 'v1.2.3' ], version: '1.2.3-beta.1+buildA' },
			{ name: 'double-v-excluded', specifier: '1.2.3', tags: [ 'vv1.2.3' ], prefixes: [ '1.2.3', 'v1.2.3' ], version: null },
			{ name: 'query-v', specifier: 'v1.2.3', tags: [ 'v1.2.3', 'vv1.2.3' ], prefixes: [ '1.2.3', 'v1.2.3', 'vv1.2.3' ], version: 'v1.2.3' },
			{ name: 'query-v-fallback', specifier: 'v1.2.3', tags: [ 'v1.2.3' ], prefixes: [ '1.2.3', 'v1.2.3', 'vv1.2.3' ], version: '1.2.3' },
			{ name: 'literal-v-major', specifier: 'v1', tags: [ 'vv1', '1.9.0' ], prefixes: [ '1', 'v1', 'vv1' ], version: 'v1' },
			{ name: 'bounded-range', specifier: '^1.2.3', tags: [ 'v1.3.0', '1.2.3', '2.0.0', '1.4.0-beta.1' ], prefixes: [ '1', 'v1' ], version: '1.3.0' },
			{ name: 'partial-minor', specifier: '1.2', tags: [ '1.2.9', 'v1.2.3', '1.9.0', '2.0.0' ], prefixes: [ '1', 'v1' ], version: '1.2.9' },
			{ name: 'tilde-range', specifier: '~1.2.3', tags: [ 'v1.2.9', '1.3.0', '2.0.0' ], prefixes: [ '1', 'v1' ], version: '1.2.9' },
			{ name: 'zero-major-range', specifier: '^0.2.3', tags: [ '0.2.9', 'v0.2.3', '0.9.0', '1.0.0' ], prefixes: [ '0', 'v0' ], version: '0.2.9' },
			{ name: 'same-major-union', specifier: '1.2 || 1.4', tags: [ '1.2.9', 'v1.4.2', '1.9.0', '2.0.0' ], prefixes: [ '1', 'v1' ], version: '1.4.2' },
			{ name: 'literal-minor', specifier: '1.2', tags: [ '1.2', '1.2.9', '1.9.0' ], prefixes: [ '1' ], version: '1.2' },
			{ name: 'literal-range', specifier: '1', tags: [ '1', '1.9.0' ], prefixes: [ '1' ], version: '1' },
			{ name: 'negative', specifier: 'missing', tags: [ 'missing-extra' ], prefixes: [ 'missing', 'vmissing' ], version: null },
			{ name: 'literal-slash', specifier: '2.020R-ro/1.075R-it', tags: [ 'v2.020R-ro/1.075R-it' ], prefixes: [ '2.020R-ro/1.075R-it', 'v2.020R-ro/1.075R-it' ], version: '2.020R-ro/1.075R-it' },
			{ name: 'literal-symbols', specifier: 'release%+#1', tags: [ 'release%+#1' ], prefixes: [ 'release%+#1' ], version: 'release%+#1' },
			{ name: 'double-v-range-excluded', specifier: '^1.2.3', tags: [ 'vv1.9.0', 'v1.3.0' ], prefixes: [ '1', 'v1' ], version: '1.3.0' },
			{ name: 'tie-build-across-prefixes', specifier: '1.2.3', tags: [ 'v1.2.3+buildA', '1.2.3+BuildA' ], prefixes: [ '1.2.3', 'v1.2.3' ], versions: [ '1.2.3+buildA', '1.2.3+BuildA' ] },
			{ name: 'tie-build-within-prefix', specifier: '1.2.3', tags: [ 'v1.2.3+build', 'v1.2.3+Build' ], prefixes: [ '1.2.3', 'v1.2.3' ], versions: [ '1.2.3+build', '1.2.3+Build' ] },
			{ name: 'tie-prerelease-case', specifier: '^1.2.3-rcA', tags: [ 'v1.2.3-rcA', '1.2.3-rca' ], prefixes: [ '1', 'v1' ], version: '1.2.3-rca' },
		].forEach(({ name, specifier, tags, prefixes, version, versions = [ version ] }) => {
			it(`preserves ${name} matching and caches the prefixes`, async () => {
				let firstPage = nock('https://api.github.com')
					.get(`/repos/prefix-tests/${name}/tags`).query({ per_page: 100 })
					.reply(200, [], { link: `<https://api.github.com/repos/prefix-tests/${name}/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/${name}/tags?per_page=100&page=11>; rel="last"` });
				let calls = [];
				let basePath = `/repos/prefix-tests/${name}/git/matching-refs/tags/`;
				let upstream = nock('https://api.github.com')
					.get(path => decodeURIComponent(path).startsWith(basePath))
					.query(true)
					.times(prefixes.length)
					.reply((path) => {
						let prefix = decodeURIComponent(path.split('?')[0]).substring(basePath.length);
						calls.push(prefix);
						return [ 200, tags.filter(tag => tag.startsWith(prefix)).sort().map(tag => ({ ref: `refs/tags/${tag}` })), { etag: `"${name}-${prefix}"` }];
					});

				for (let i = 0; i < 2; i++) {
					let response = await chai.request(server)
						.get(`/v1/packages/gh/prefix-tests/${name}/resolved`)
						.query({ specifier });

					expect(response).to.have.status(200);
					expect(response.body.version).to.be.oneOf(versions);
				}

				expect(calls).to.deep.equal(prefixes);
				expect(firstPage.isDone()).to.be.true;
				expect(upstream.isDone()).to.be.true;
			});
		});

		it('reuses major-prefix results across different minor ranges', async () => {
			let calls = [];
			let tags = [ '1.2.9', 'v1.7.3', '1.9.0', '2.0.0' ];
			let basePath = '/repos/prefix-tests/shared-major/git/matching-refs/tags/';
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/shared-major/tags').query({ per_page: 100 })
				.reply(200, [], { link: '<https://api.github.com/repos/prefix-tests/shared-major/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/shared-major/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path).startsWith(basePath)).query(true).times(2)
				.reply((path) => {
					let prefix = decodeURIComponent(path.split('?')[0]).substring(basePath.length);
					calls.push(prefix);
					return [ 200, tags.filter(tag => tag.startsWith(prefix)).map(tag => ({ ref: `refs/tags/${tag}` })) ];
				});

			for (let [ specifier, version ] of [ [ '~1.2.3', '1.2.9' ], [ '~1.7.0', '1.7.3' ] ]) {
				let response = await chai.request(server).get('/v1/packages/gh/prefix-tests/shared-major/resolved').query({ specifier });
				expect(response).to.have.status(200);
				expect(response.body).to.include({ version });
			}

			expect(calls).to.deep.equal([ '1', 'v1' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('reuses a fresh complete list without making prefix requests', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/complete/tags')
				.query({ per_page: 100 })
				.reply(200, [{ name: 'v1.2.3' }, { name: 'release' }]);

			let metadata = await chai.request(server).get('/v1/packages/gh/prefix-tests/complete');
			expect(metadata).to.have.status(200);

			for (let specifier of [ '1.2.3', 'release' ]) {
				let response = await chai.request(server).get('/v1/packages/gh/prefix-tests/complete/resolved').query({ specifier });
				expect(response).to.have.status(200);
				expect(response.body).to.include({ version: specifier });
			}

			expect(upstream.isDone()).to.be.true;
		});

		[
			{ name: 'new-literal', cachedTags: [ 'older' ], refs: [ [ 'release', [ 'release', 'release-extra' ] ] ], version: 'release' },
			{ name: 'prefixed-literal', cachedTags: [ 'older' ], refs: [ [ 'release', [ 'release-extra' ] ], [ 'vrelease', [ 'vrelease' ] ] ], version: 'release' },
			{ name: 'removed-literal', cachedTags: [ 'release' ], refs: [ [ 'release', [ 'release-extra' ] ], [ 'vrelease', [] ] ], version: null },
			{ name: 'literal-quota-error', cachedTags: [ 'release' ], status: 403, version: 'release' },
			{ name: 'literal-server-error', cachedTags: [ 'release' ], status: 503, version: 'release' },
			{ name: 'literal-network-error', cachedTags: [ 'release' ], networkError: true, version: 'release' },
			{ name: 'literal-not-found', cachedTags: [ 'release' ], status: 404, responseStatus: 404 },
		].forEach(({ name, cachedTags, refs, status, networkError, version, responseStatus = 200 }) => {
			it(`looks up ${name} instead of refreshing a stale complete list`, async () => {
				let upstream = nock('https://api.github.com')
					.get(`/repos/prefix-tests/${name}/tags`).query({ per_page: 100 })
					.reply(200, cachedTags.map(name => ({ name })), { etag: '"literal-complete"' });
				let url = `/v1/packages/gh/prefix-tests/${name}`;
				let metadata = await chai.request(server).get(url);
				expect(metadata).to.have.status(200);
				expect(upstream.isDone()).to.be.true;
				expect(await redis.pExpire(`rrrc/pr/gh/prefix-tests/${name}`, (30 * 24 * 60 - 25) * 60 * 1000)).to.equal(1);

				let lookup = nock('https://api.github.com');

				for (let [ prefix, names ] of refs || [ [ 'release', [] ] ]) {
					let request = lookup.get(path => decodeURIComponent(path) === `/repos/prefix-tests/${name}/git/matching-refs/tags/${prefix}`).query({ per_page: 100 });

					if (networkError) {
						request.replyWithError({ code: 'ECONNRESET', message: 'Connection reset' });
					} else {
						request.reply(status || 200, names.map(name => ({ ref: `refs/tags/${name}` })), status === 403 ? { 'x-ratelimit-remaining': '0' } : {});
					}
				}

				let response = await chai.request(server).get(`${url}/resolved?specifier=release`);
				expect(response).to.have.status(responseStatus);

				if (responseStatus === 200) {
					expect(response.body).to.include({ version });
				}

				expect(lookup.isDone()).to.be.true;
				let complete = await new RedisRemoteResourceCache('pr/gh').getCached(`/prefix-tests/${name}`);
				expect(complete.data).to.have.members(cachedTags);
				expect(complete.isStale).to.be.true;
			});
		});

		it('falls back to the complete list when revalidating an older empty literal prefix fails', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/literal-stale-prefix/tags').query({ per_page: 100 })
				.reply(200, [], { link: '<https://api.github.com/repos/prefix-tests/literal-stale-prefix/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/literal-stale-prefix/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/literal-stale-prefix/git/matching-refs/tags/release').query(true).reply(200, [])
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/literal-stale-prefix/git/matching-refs/tags/vrelease').query(true).reply(200, [])
				.get('/repos/prefix-tests/literal-stale-prefix/tags').query({ per_page: 100, page: 2 }).reply(200, [{ name: 'release' }]);
			let url = '/v1/packages/gh/prefix-tests/literal-stale-prefix';
			let first = await chai.request(server).get(`${url}/resolved?specifier=release`);
			expect(first.body).to.include({ version: null });
			let metadata = await chai.request(server).get(url);
			expect(metadata).to.have.status(200);
			expect(upstream.isDone()).to.be.true;
			expect(await redis.pExpire('rrrc/pr/gh/prefix-tests/literal-stale-prefix', (30 * 24 * 60 - 25) * 60 * 1000)).to.equal(1);
			let keys = await redis.keys('rrrc/pr/gh*prefix-tests/literal-stale-prefix/git/*');
			expect(keys).to.have.lengthOf(2);
			await Promise.all(keys.map(key => redis.pExpire(key, (30 * 24 * 60 - 25) * 60 * 1000)));

			let failure = nock('https://api.github.com')
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/literal-stale-prefix/git/matching-refs/tags/release').query(true).reply(503)
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/literal-stale-prefix/git/matching-refs/tags/vrelease').query(true).reply(503);
			let response = await chai.request(server).get(`${url}/resolved?specifier=release`);
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: 'release' });
			expect(failure.isDone()).to.be.true;
		});

		it('keeps an exact stale prefix match missing from the complete list when refresh fails', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/literal-stale-match/tags').query({ per_page: 100 })
				.reply(200, [{ name: 'older' }], { link: '<https://api.github.com/repos/prefix-tests/literal-stale-match/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/literal-stale-match/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/literal-stale-match/git/matching-refs/tags/release').query(true).reply(200, [{ ref: 'refs/tags/release' }])
				.get('/repos/prefix-tests/literal-stale-match/tags').query({ per_page: 100, page: 2 }).reply(200, []);
			let url = '/v1/packages/gh/prefix-tests/literal-stale-match';
			let first = await chai.request(server).get(`${url}/resolved?specifier=release`);
			expect(first.body).to.include({ version: 'release' });
			let metadata = await chai.request(server).get(url);
			expect(metadata).to.have.status(200);
			expect(metadata.body.versions.map(item => item.version)).to.deep.equal([ 'older' ]);
			expect(upstream.isDone()).to.be.true;
			expect(await redis.pExpire('rrrc/pr/gh/prefix-tests/literal-stale-match', (30 * 24 * 60 - 35) * 60 * 1000)).to.equal(1);
			let keys = await redis.keys('rrrc/pr/gh*prefix-tests/literal-stale-match/git/*');
			expect(keys).to.have.lengthOf(1);
			expect(await redis.pExpire(keys[0], (30 * 24 * 60 - 25) * 60 * 1000)).to.equal(1);

			let failure = nock('https://api.github.com')
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/literal-stale-match/git/matching-refs/tags/release').query(true).reply(503);
			let response = await chai.request(server).get(`${url}/resolved?specifier=release`);
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: 'release' });
			expect(failure.isDone()).to.be.true;
		});

		for (let stale of [ false, true ]) {
			it(`checks the ${stale ? 'stale' : 'fresh'} v-prefixed exact match after a stale literal miss`, async () => {
				let repo = `literal-second-match-${stale ? 'stale' : 'fresh'}`;
				let basePath = `/repos/prefix-tests/${repo}`;
				let upstream = nock('https://api.github.com')
					.get(`${basePath}/tags`).query({ per_page: 100 })
					.reply(200, [{ name: 'older' }], { link: `<https://api.github.com${basePath}/tags?per_page=100&page=2>; rel="next", <https://api.github.com${basePath}/tags?per_page=100&page=11>; rel="last"` })
					.get(path => decodeURIComponent(path) === `${basePath}/git/matching-refs/tags/release`).query(true).reply(200, [])
					.get(path => decodeURIComponent(path) === `${basePath}/git/matching-refs/tags/vrelease`).query(true).reply(200, [{ ref: 'refs/tags/vrelease' }])
					.get(`${basePath}/tags`).query({ per_page: 100, page: 2 }).reply(200, []);
				let url = `/v1/packages/gh/prefix-tests/${repo}`;
				let first = await chai.request(server).get(`${url}/resolved?specifier=release`);
				expect(first.body).to.include({ version: 'release' });
				let metadata = await chai.request(server).get(url);
				expect(metadata).to.have.status(200);
				expect(metadata.body.versions.map(item => item.version)).to.deep.equal([ 'older' ]);
				expect(upstream.isDone()).to.be.true;
				expect(await redis.pExpire(`rrrc/pr/gh/prefix-tests/${repo}`, (30 * 24 * 60 - 35) * 60 * 1000)).to.equal(1);
				let keys = await redis.keys(`rrrc/pr/gh*prefix-tests/${repo}/git/*`);
				expect(keys).to.have.lengthOf(2);

				for (let key of keys) {
					if (stale || !key.toString().endsWith('vrelease')) {
						expect(await redis.pExpire(key, (30 * 24 * 60 - 25) * 60 * 1000)).to.equal(1);
					}
				}

				let failure = nock('https://api.github.com')
					.get(path => decodeURIComponent(path) === `${basePath}/git/matching-refs/tags/release`).query(true).reply(503);

				if (stale) {
					failure.get(path => decodeURIComponent(path) === `${basePath}/git/matching-refs/tags/vrelease`).query(true).reply(503);
				}

				let response = await chai.request(server).get(`${url}/resolved?specifier=release`);
				expect(response).to.have.status(200);
				expect(response.body).to.include({ version: 'release' });
				expect(failure.isDone()).to.be.true;
			});
		}

		it('conditionally refreshes a retained complete list instead of querying prefixes', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/retained/tags').query({ per_page: 100 })
				.reply(200, [{ name: '1.2.3' }], { etag: '"retained-head"', link: '<https://api.github.com/repos/prefix-tests/retained/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/retained/tags?per_page=100&page=11>; rel="last"' })
				.get('/repos/prefix-tests/retained/tags').query({ per_page: 100, page: 2 })
				.reply(200, [{ name: '1.1.0' }], { etag: '"retained-tail"' });
			let metadata = await chai.request(server).get('/v1/packages/gh/prefix-tests/retained');
			expect(metadata).to.have.status(200);
			expect(upstream.isDone()).to.be.true;
			let keys = await redis.keys('rrrc/pr/gh*prefix-tests/retained*');
			expect(keys).to.have.lengthOf(2);
			await Promise.all(keys.map(key => redis.pExpire(key, (30 * 24 * 60 - 25) * 60 * 1000)));

			let refresh = nock('https://api.github.com')
				.get('/repos/prefix-tests/retained/tags').query({ per_page: 100 }).matchHeader('if-none-match', '"retained-head"').reply(304)
				.get('/repos/prefix-tests/retained/tags').query({ per_page: 100, page: 2 }).matchHeader('if-none-match', '"retained-tail"')
				.reply(200, [{ name: '1.3.0' }]);
			let response = await chai.request(server).get('/v1/packages/gh/prefix-tests/retained/resolved?specifier=^1');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: '1.3.0' });
			expect(refresh.isDone()).to.be.true;
			metadata = await chai.request(server).get('/v1/packages/gh/prefix-tests/retained');
			expect(metadata.body.versions.map(item => item.version)).to.have.members([ '1.2.3', '1.3.0' ]);
		});

		it('keeps complete enumeration for an unbounded range', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/unbounded/tags')
				.query({ per_page: 100 })
				.reply(200, [{ name: 'v1.2.3' }, { name: 'v2.0.0' }]);

			let response = await chai.request(server)
				.get('/v1/packages/gh/prefix-tests/unbounded/resolved')
				.query({ specifier: '>=1.0.0' });

			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: '2.0.0' });
			expect(upstream.isDone()).to.be.true;

			for (let specifier of [ '>1.2.9007199254740991 <2', '>=9007199254740991.0.0' ]) {
				let response = await chai.request(server)
					.get('/v1/packages/gh/prefix-tests/unbounded/resolved')
					.query({ specifier });
				expect(response).to.have.status(200);
				expect(response.body).to.include({ version: null });
			}
		});

		it('does not use prefix results as a complete package listing', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/listing/tags').query({ per_page: 100 })
				.reply(200, [{ name: '2.0.0' }], { link: '<https://api.github.com/repos/prefix-tests/listing/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/listing/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/listing/git/matching-refs/tags/release').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/release' }])
				.get('/repos/prefix-tests/listing/tags')
				.query({ per_page: 100, page: 2 })
				.reply(200, [{ name: 'release' }, { name: 'another-tag' }]);
			let resolution = await chai.request(server).get('/v1/packages/gh/prefix-tests/listing/resolved?specifier=release');
			expect(resolution).to.have.status(200);
			expect(resolution.body).to.include({ version: 'release' });

			let response = await chai.request(server).get('/v1/packages/gh/prefix-tests/listing');
			expect(response).to.have.status(200);
			expect(response.body.versions.map(item => item.version)).to.have.members([ '2.0.0', 'release', 'another-tag' ]);
			expect(upstream.isDone()).to.be.true;
		});

		it('conditionally revalidates cached empty prefix results', async () => {
			nock('https://api.github.com').get('/repos/prefix-tests/revalidation/tags').query({ per_page: 100 })
				.reply(200, [], { etag: '"large-first-page"', link: '<https://api.github.com/repos/prefix-tests/revalidation/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/revalidation/tags?per_page=100&page=11>; rel="last"' });

			let path = '/repos/prefix-tests/revalidation/git/matching-refs/';
			let matchPath = candidate => decodeURIComponent(candidate).startsWith(path);
			let upstream = nock('https://api.github.com').get(matchPath).query(true).twice().reply(200, [], { etag: '"empty-prefix"' });
			let url = '/v1/packages/gh/prefix-tests/revalidation/resolved?specifier=missing';
			let first = await chai.request(server).get(url);
			expect(first).to.have.status(200);
			expect(first.body).to.include({ version: null });
			expect(upstream.isDone()).to.be.true;

			let keys = await redis.keys('rrrc/pr/gh*prefix-tests/revalidation/*');
			expect(keys).to.have.lengthOf(3);
			await Promise.all(keys.map(key => redis.pExpire(key, (30 * 24 * 60 - 25) * 60 * 1000)));

			let pageRefresh = nock('https://api.github.com').get('/repos/prefix-tests/revalidation/tags').query({ per_page: 100 })
				.matchHeader('if-none-match', '"large-first-page"').reply(304);
			let revalidation = nock('https://api.github.com', { reqheaders: { 'if-none-match': '"empty-prefix"' } })
				.get(matchPath).query(true).twice().reply(304);
			let response = await chai.request(server).get(url);
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: null });
			expect(revalidation.isDone()).to.be.true;
			expect(pageRefresh.isDone()).to.be.true;
		});

		it('serves retained complete metadata instead of older prefixes when its refresh fails', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/stale/tags').query({ per_page: 100 })
				.reply(200, [{ name: '1.2.3' }], { link: '<https://api.github.com/repos/prefix-tests/stale/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/stale/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/stale/git/matching-refs/tags/1').query(true).reply(200, [{ ref: 'refs/tags/1.2.3' }])
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/stale/git/matching-refs/tags/v1').query(true).reply(200, [])
				.get('/repos/prefix-tests/stale/tags').query({ per_page: 100, page: 2 }).reply(200, [{ name: '1.3.0' }], { etag: '"stale-tail"' });
			let first = await chai.request(server).get('/v1/packages/gh/prefix-tests/stale/resolved?specifier=^1');
			expect(first.body).to.include({ version: '1.2.3' });
			let metadata = await chai.request(server).get('/v1/packages/gh/prefix-tests/stale');
			expect(metadata).to.have.status(200);
			expect(upstream.isDone()).to.be.true;
			let expired = await redis.pExpire('rrrc/pr/gh/prefix-tests/stale', (30 * 24 * 60 - 25) * 60 * 1000);
			expect(expired).to.equal(1);
			let prefixKeys = await redis.keys('rrrc/pr/gh*prefix-tests/stale/git/*');
			expect(prefixKeys).to.have.lengthOf(2);
			await Promise.all(prefixKeys.map(key => redis.pExpire(key, (30 * 24 * 60 - 35) * 60 * 1000)));

			let failure = nock('https://api.github.com')
				.get('/repos/prefix-tests/stale/tags').query({ per_page: 100, page: 2 }).matchHeader('if-none-match', '"stale-tail"').reply(503);
			let response = await chai.request(server).get('/v1/packages/gh/prefix-tests/stale/resolved?specifier=^1');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: '1.3.0' });
			expect(failure.isDone()).to.be.true;
		});

		it('resolves an empty repository from the first page without matching refs', async () => {
			let firstPage = nock('https://api.github.com').get('/repos/prefix-tests/empty/tags').query({ per_page: 100 })
				.reply(200, []);
			let response = await chai.request(server).get('/v1/packages/gh/prefix-tests/empty/resolved?specifier=release');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: null });
			expect(firstPage.isDone()).to.be.true;
		});

		it('uses the same cached resolution through the deprecated route', async () => {
			let upstream = nock('https://api.github.com')
				.get('/repos/prefix-tests/deprecated/tags').query({ per_page: 100 })
				.reply(200, [], { link: '<https://api.github.com/repos/prefix-tests/deprecated/tags?per_page=100&page=2>; rel="next", <https://api.github.com/repos/prefix-tests/deprecated/tags?per_page=100&page=11>; rel="last"' })
				.get(path => decodeURIComponent(path) === '/repos/prefix-tests/deprecated/git/matching-refs/tags/83.0.4100.0').query({ per_page: 100 })
				.reply(200, [{ ref: 'refs/tags/83.0.4100.0' }]);
			let resolution = await chai.request(server).get('/v1/packages/gh/prefix-tests/deprecated/resolved?specifier=83.0.4100.0');
			expect(resolution).to.have.status(200);
			expect(resolution.body).to.include({ version: '83.0.4100.0' });
			let response = await chai.request(server).get('/v1/package/resolve/gh/prefix-tests/deprecated@83.0.4100.0');
			expect(response).to.have.status(200);
			expect(response.body).to.include({ version: '83.0.4100.0' });
			expect(upstream.isDone()).to.be.true;
		});
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=*', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=*')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/jquery/resolved?specifier=<1.8.0 - deprecated versions', () => {
		return chai.request(server)
			.get('/v1/packages/npm/jquery/resolved?specifier=<1.8.0')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '1.0.0' });
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/package-only-prereleases/resolved', () => {
		return chai.request(server)
			.get('/v1/packages/npm/package-only-prereleases/resolved')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '1.0.0-beta.1' });
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/npm/@martin-kolarik/batch-queue/resolved', () => {
		return chai.request(server)
			.get('/v1/packages/npm/@martin-kolarik/batch-queue/resolved')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '1.0.0' });
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
			});
	});

	it('GET /v1/packages/gh/jquery/jquery/resolved?specifier=*', () => {
		return chai.request(server)
			.get('/v1/packages/gh/jquery/jquery/resolved?specifier=*')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;
				expect(response.body).to.include({ version: '3.2.1' });
				expect(response).to.matchSnapshot();
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
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
				expect(response).to.matchApiSchema();
			});
	});
});
