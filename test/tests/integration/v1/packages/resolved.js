import { setupSnapshots } from '../../../../utils.js';
import nock from 'nock';
import redis from '../../../../../src/lib/redis/index.js';
import RedisRemoteResourceCache from '../../../../../src/remote-services/RedisRemoteResourceCache.js';

describe('/v1/packages/resolved', () => {
	before(() => {
		setupSnapshots(import.meta.url);
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
