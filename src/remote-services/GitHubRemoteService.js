import _ from 'lodash';
import HttpLinkHeader from 'http-link-header';
import { Octokit } from '@octokit/rest';
import vCompare from 'v-compare';
import semver from 'semver';
import config from 'config';
import apmClient from 'elastic-apm-node';
import { execFile } from 'child_process';
import { promisify } from 'util';
import GitHubRemoteResource from './GitHubRemoteResource.js';
import RemoteService from './RemoteService.js';

const { userAgent } = config.get('server');
const execFileAsync = promisify(execFile);
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * oneHour;

class GitHubRemoteService extends RemoteService {
	constructor ({ auth, baseUrl }, resourceCache) {
		super(resourceCache);

		this.octokit = new Octokit({
			auth,
			baseUrl,
			userAgent,
			request: {
				timeout: 30000,
			},
			log: {
				debug: _.noop,
				info: _.noop,
				warn: _.noop,
				error: _.noop,
			},
		});
	}

	/**
	 * @param {string} owner
	 * @param {string} repo
	 * @param {Object} [options]
	 * @param {string} [options.prefix]
	 * @param {GitHubRemoteResource} [options.firstPage]
	 * @param {Array<{name: string, key: string, id: string, checkedAt: number}>} [options.redirects]
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	async listTags (owner, repo, { prefix, firstPage, redirects = [] } = {}) {
		let resource = await this.getTagsResource(owner, repo, prefix, firstPage);
		return this.followRedirect(resource, owner, repo, this.getTagsKey(owner, repo, prefix), redirects, (owner, repo, redirects) => this.listTags(owner, repo, { prefix, redirects }));
	}

	getTagsKey (owner, repo, prefix) {
		return prefix ? this.octokit.git.listMatchingRefs.endpoint({ owner, repo, ref: `tags/${prefix}` }).url : `/${owner}/${repo}`;
	}

	// Return redirect metadata unchanged so callers can follow it outside the cache callback.
	getTagsResource (owner, repo, prefix, firstPage) {
		let key = this.getTagsKey(owner, repo, prefix);
		let uri = prefix ? key : this.octokit.repos.listTags.endpoint({ owner, repo }).url;

		return this.requestWithCache(key, async (key, cached) => {
			let remoteResource;

			if (!prefix) {
				if (cached?.props.gitFetchedAt) {
					// Validate against the page paired with this Git snapshot, not the shared page cache.
					firstPage = await this.requestPage(uri, response => response.data.map(tag => tag.name), cached.parts[0], { per_page: 100 });
					let gitAge = Date.now() - cached.props.gitFetchedAt;

					if (firstPage.isFromCache && gitAge < oneDay) {
						let validated = new GitHubRemoteResource({ statusCode: 200, data: cached.data, parts: [ firstPage ], props: { ...cached.props } });
						// Hourly validation must not postpone the independent daily Git fetch.
						validated.ttlInternalRevalidate = Math.min(oneHour, oneDay - gitAge);
						return validated;
					}
				} else {
					firstPage = firstPage || await this.listTagsFirstPage(owner, repo, cached?.parts?.[0]);

					// Join an in-progress first-page refresh rather than caching a stale assembly.
					if (firstPage.isStale && !firstPage.props.redirect) {
						firstPage = await this.listTagsFirstPage(owner, repo, cached?.parts?.[0]);
					}
				}

				if (firstPage.props.redirect) {
					return firstPage;
				}

				if ((firstPage.props.lastPage ?? (cached?.props.gitFetchedAt ? Infinity : cached?.parts?.length)) > 25) {
					remoteResource = await this.listTagsGit(owner, repo, firstPage);
				}
			}

			remoteResource = remoteResource || await this.paginate(uri, response => response.data.map(t => prefix ? t.ref.substring('refs/tags/'.length) : t.name), cached, firstPage);

			if (remoteResource.isFromCache) {
				return remoteResource;
			}

			remoteResource.data = _(remoteResource.data)
				.map(tag => tag.charAt(0) === 'v' ? tag.substr(1) : tag)
				.filter(v => v)
				.sort(vCompare.rCompare)
				.uniq()
				.value();

			return remoteResource;
		});
	}

	/**
	 * List all tag refs without REST pagination, keeping the REST validator with its Git snapshot.
	 * @param {string} owner
	 * @param {string} repo
	 * @param {GitHubRemoteResource} firstPage
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	async listTagsGit (owner, repo, firstPage) {
		let { token } = await this.octokit.auth();
		let span = apmClient.startSpan('git ls-remote', 'external', 'git');

		try {
			let { stdout } = await execFileAsync('git', [ '-c', 'protocol.version=2', '-c', 'credential.helper=', 'ls-remote', '--tags', '--refs', `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}.git` ], {
				timeout: 30000,
				killSignal: 'SIGKILL',
				maxBuffer: 64 * 1024 * 1024,
				windowsHide: true,
				env: {
					...process.env,
					GIT_TERMINAL_PROMPT: '0',
					GIT_CONFIG_COUNT: token ? '1' : '0',
					GIT_CONFIG_KEY_0: 'http.https://github.com/.extraHeader',
					// Keep credentials out of subprocess arguments and URLs.
					GIT_CONFIG_VALUE_0: token ? `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}` : '',
				},
			});

			let data = stdout.split('\n').filter(Boolean).map(line => line.substring(line.indexOf('\t') + '\trefs/tags/'.length));
			span?.setOutcome('success');
			return new GitHubRemoteResource({ statusCode: 200, data, parts: [ firstPage ], props: { gitFetchedAt: Date.now() } });
		} catch (error) {
			span?.setOutcome('failure');
			log.error('Git tag listing failed.', _.pick(error, [ 'code', 'signal', 'killed' ]));
			// Subprocess diagnostics can include remote details; expose only a safe upstream error.
			throw new GitHubRemoteResource({ statusCode: 502 }, new Error('Git tag listing failed.'));
		} finally {
			span?.end();
		}
	}

	/**
	 * Cache raw first-page tags and pagination links independently of the complete list.
	 *
	 * @param {string} owner
	 * @param {string} repo
	 * @param {GitHubRemoteResource|null} [fallback] First page from an existing complete list, used if the separate cache entry is absent.
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	listTagsFirstPage (owner, repo, fallback) {
		let uri = this.octokit.repos.listTags.endpoint({ owner, repo }).url;

		return this.requestWithCache(`${uri}?per_page=100`, (key, cached) => {
			return this.requestPage(uri, response => response.data.map(tag => tag.name), cached || fallback, { per_page: 100 });
		});
	}

	/**
	 * Return normalized tag candidates, preferring complete listings except for stale literal lookups.
	 *
	 * @param {string} owner
	 * @param {string} repo
	 * @param {string} specifier
	 * @param {Array<{name: string, key: string, id: string, checkedAt: number}>} [redirects]
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	async listTagsForSpecifier (owner, repo, specifier, redirects = []) {
		let prefixes = GitHubRemoteService.getTagPrefixes(specifier);

		if (!prefixes) {
			return this.listTags(owner, repo, { redirects });
		}

		let cached = await this.resourceCache.getCached(`/${owner}/${repo}`);
		let follow = async (resource, key) => {
			try {
				let result = await this.followRedirect(resource, owner, repo, key, redirects, (owner, repo, redirects) => this.listTagsForSpecifier(owner, repo, specifier, redirects));

				// A stale alias alone must not override fresh canonical tag data.
				if (cached?.statusCode === 200 && cached.age < cached.staleIfError && result.age > result.ttlInternalRevalidate && !result.data.includes(specifier)) {
					if (cached.data.includes(specifier) || !result.data.some(version => !version.startsWith('v') && semver.satisfies(version, specifier))) {
						return cached;
					}
				}

				return result;
			} catch (error) {
				if (cached?.statusCode === 200 && cached.age < cached.staleIfError && !error.forceCacheUpdate) {
					return cached;
				}

				throw error;
			}
		};

		if (cached?.props.redirect) {
			let resource = cached.isStale ? await this.getTagsResource(owner, repo) : cached;
			return follow(resource, `/${owner}/${repo}`);
		}

		// Prefer Git-backed listings even when stale; literal lookups can bypass stale REST listings.
		if (cached && (!cached.isStale || cached.props.gitFetchedAt || cached.statusCode !== 200 || semver.validRange(specifier, { includePrerelease: true }) !== null)) {
			let resource = await this.getTagsResource(owner, repo);
			return follow(resource, `/${owner}/${repo}`);
		}

		let resources = [];

		if (!cached) {
			let firstPage = await this.listTagsFirstPage(owner, repo);

			if (firstPage.props.redirect) {
				let key = `${this.octokit.repos.listTags.endpoint({ owner, repo }).url}?per_page=100`;
				return follow(firstPage, key);
			}

			// Use the full listing for small repos.
			if (!firstPage.props.lastPage || firstPage.props.lastPage <= 10) {
				let resource = await this.getTagsResource(owner, repo, undefined, firstPage);
				return follow(resource, `/${owner}/${repo}`);
			}
		}

		try {
			for (let prefix of prefixes) {
				let resource = await this.getTagsResource(owner, repo, prefix);

				if (resource.props.redirect) {
					return await follow(resource, this.getTagsKey(owner, repo, prefix));
				}

				// An exact normalized tag always wins, regardless of other matching tags.
				if (resource.data.includes(specifier)) {
					return resource;
				}

				resources.push(resource);
			}
		} catch (error) {
			if (cached && cached.age < cached.staleIfError && !error.forceCacheUpdate) {
				return cached;
			}

			throw error;
		}

		// Check every literal prefix before falling back for a stale miss.
		if (cached && cached.age < cached.staleIfError && resources.some(resource => resource.isStale)) {
			return cached;
		}

		let data = _(resources).flatMap('data').uniq().value();

		let resource = new GitHubRemoteResource({ statusCode: 200, data });
		resource.age = Math.max(...resources.map(resource => resource.age));
		return resource;
	}

	/**
	 * Cache redirects as metadata, then follow them outside the old key's callback.
	 */
	requestWithCache (uri, exec) {
		return super.requestWithCache(uri, async (key, cached) => {
			let previous = cached?.props.redirect;
			let clearDestination404s = async (resource) => {
				let { name } = resource.props.redirect;

				if (!resource.isStale && name !== previous?.name) {
					let [ owner, repo ] = name.split('/');
					let firstPageKey = `${this.octokit.repos.listTags.endpoint({ owner, repo }).url}?per_page=100`;

					for (let key of [ `/${name}`, firstPageKey ]) {
						if ((await this.resourceCache.getCached(key))?.statusCode === 404) {
							await this.resourceCache.delete(key);
						}
					}
				}

				return resource;
			};

			if (cached?.props.redirect) {
				let { id, source, checkedAt } = cached.props.redirect;

				if (Date.now() - checkedAt < oneHour) {
					try {
						let redirect = await this.getRepositoryRedirect(id, source, cached);

						if (redirect.props.redirect.name !== source) {
							return clearDestination404s(redirect);
						}
					} catch (error) {
						if (error.statusCode !== 404) {
							throw error;
						}
					}
				}

				// Recheck the original name independently of hourly ID metadata refreshes.
				cached = null;
			}

			try {
				return await exec(key, cached);
			} catch (error) {
				if (!error.props?.redirect) {
					throw error;
				}

				return clearDestination404s(error);
			}
		});
	}

	async getRepositoryRedirect (id, source, cached) {
		let uri = this.octokit.request.endpoint('GET /repositories/{repository_id}', { repository_id: id }).url;
		let metadata = await super.requestWithCache(uri, async (key, metadata) => {
			let response = await this.requestConditional(uri, metadata || cached);
			let name = response.props.redirect ? response.props.redirect.name : response.data?.full_name;

			if (typeof name !== 'string' || name.split('/').length !== 2 || name.split('/').some(part => !part)) {
				throw new GitHubRemoteResource({ statusCode: 502 }, new Error('Invalid GitHub repository name.'));
			}

			return new GitHubRemoteResource({ statusCode: 200, data: { full_name: name }, headers: _.pick(response.headers, 'etag', 'last-modified'), ttlInternalRevalidate: oneHour });
		});
		let redirect = new GitHubRemoteResource({
			statusCode: 301,
			headers: metadata.headers,
			props: { redirect: { id, name: metadata.data.full_name, source, checkedAt: cached?.props.redirect.checkedAt ?? Date.now() } },
		});
		redirect.age = metadata.age;
		return redirect;
	}

	async followRedirect (resource, owner, repo, key, redirects, follow) {
		if (!resource.props.redirect) {
			return resource;
		}

		let { name, id, checkedAt } = resource.props.redirect;
		let expectedId = redirects.at(-1)?.id;
		let conflicting = expectedId !== undefined && expectedId !== id;
		let visited = [ ...redirects, { name: `${owner}/${repo}`, key, id: expectedId ?? id, checkedAt }];
		// A different check time distinguishes a live conflict from the same cached marker being replayed.
		let repeatedConflict = conflicting && redirects.some(entry => entry.name === `${owner}/${repo}` && entry.checkedAt !== checkedAt);

		if (visited.length > 5 || repeatedConflict) {
			throw new GitHubRemoteResource({ statusCode: 502 }, new Error('GitHub repository redirect loop.'));
		}

		let previous = conflicting ? { name: `${owner}/${repo}`, key } : visited.find(entry => entry.name === name);

		if (previous) {
			await this.resourceCache.delete(previous.key);

			if (previous.key === `/${previous.name}`) {
				let [ owner, repo ] = previous.name.split('/');
				let firstPageKey = `${this.octokit.repos.listTags.endpoint({ owner, repo }).url}?per_page=100`;

				if ((await this.resourceCache.getCached(firstPageKey))?.props.redirect) {
					await this.resourceCache.delete(firstPageKey);
				}
			}
		}

		if (conflicting) {
			return follow(owner, repo, visited);
		}

		let markStale = (result) => {
			if (!resource.isStale || !(result instanceof GitHubRemoteResource) || result.isStale) {
				return result;
			}

			let detached = new GitHubRemoteResource({ ...result, props: { ...result.props, staleRedirect: true } }, result.error, result.isFromCache);
			detached.age = result.age;
			return detached;
		};

		try {
			return markStale(await follow(...name.split('/'), visited));
		} catch (error) {
			throw markStale(error);
		}
	}

	/**
	 * Use exact-version or literal prefixes, and major prefixes for ranges confined to one major.
	 * Return null when full enumeration is required.
	 *
	 * @param {string} [specifier]
	 * @returns {string[]|null}
	 */
	static getTagPrefixes (specifier) {
		if (!specifier || specifier === 'latest' || specifier === '*') {
			return null;
		}

		// These characters cannot occur in a Git ref, so there cannot be a literal tag.
		let literal = /[\x00-\x20\x7f~^:?*[\]\\]/.test(specifier) ? [] : [ specifier, `v${specifier}` ];
		let range = semver.validRange(specifier, { includePrerelease: true });

		if (range === null) {
			return literal.length ? literal : null;
		}

		try {
			let version = semver.parse(specifier);
			let minimum = version || semver.minVersion(range, { includePrerelease: true });

			// Include prereleases when proving that every possible match stays in one major.
			if (!minimum || (!version && !semver.subset(range, String(minimum.major), { includePrerelease: true }))) {
				return null;
			}

			// Cover normal numeric tags and preserve explicit literal spellings.
			let prefix = version ? `${version.major}.${version.minor}.${version.patch}` : String(minimum.major);
			let prefixes = _.uniq([ prefix, `v${prefix}`, ...literal ]);
			return prefixes.filter(prefix => !prefixes.some(other => other !== prefix && prefix.startsWith(other)));
		} catch {
			// Range arithmetic can overflow for otherwise valid semver components.
			return null;
		}
	}

	/**
	 * @param {string} uri
	 * @param {function} mapper
	 * @param {GitHubRemoteResource|null} [cached]
	 * @param {GitHubRemoteResource} [firstPage]
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	paginate (uri, mapper, cached, firstPage) {
		let i = 0;
		let f = (uri, data = [], parts = []) => {
			let remoteResourcePart = cached && cached.parts && cached.parts[i];
			let options = i === 0 ? { per_page: 100 } : {}; // Pagination options are already included in the "next" link for subsequent pages.
			let page = i === 0 && firstPage ? Promise.resolve(firstPage) : this.requestPage(uri, mapper, remoteResourcePart, options);
			i++;

			return page.then((part) => {
				let next = part.props.next;
				parts.push(part);
				data.push(...part.data);

				if (next) {
					return f(next, data, parts);
				}

				return { data, parts };
			});
		};

		return f(uri).then(({ data, parts }) => new GitHubRemoteResource({ statusCode: 200, data, parts }));
	}

	/**
	 * Fetch or conditionally revalidate one page, retaining its validators and pagination links.
	 *
	 * @param {string} uri
	 * @param {(response: GitHubRemoteResource) => string[]} mapper Maps a fresh response to tag names; cached page data is already mapped.
	 * @param {GitHubRemoteResource|null} [cached]
	 * @param {Object} [options]
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	requestPage (uri, mapper, cached, options) {
		return this.requestConditional(uri, cached, options).then((response) => {
			if (response.isFromCache) {
				// A 304 validates this page again; do not retain its previous age or mutate it.
				return new GitHubRemoteResource({ statusCode: 200, data: response.data, headers: response.headers, props: response.props }, null, true);
			}

			let links = new HttpLinkHeader(response.headers.link || '');
			let next = links.rel('next')[0]?.uri;
			let last = links.rel('last')[0]?.uri;
			response.props.next = next;
			response.props.lastPage = last ? Number(new URL(last).searchParams.get('page')) : next ? undefined : 1;
			response.data = mapper(response);
			response.headers = _.pick(response.headers, 'etag', 'last-modified');
			return response;
		});
	}

	/**
	 * @returns {this}
	 */
	reportUsage () {
		if (this.reportUsageInterval) {
			return this;
		}

		let remaining = -1;

		this.reportUsageInterval = setInterval(() => {
			this.octokit.rateLimit.get().then((response) => {
				remaining = response.data.resources.core.remaining;
			}).catch(() => {});
		}, 30 * 1000);

		setTimeout(() => {
			apmClient.registerMetric('github.remaining', () => {
				return remaining;
			});
		}, 40 * 1000);

		return this;
	}

	/**
	 * @param {string} uri
	 * @param {RemoteResource|null} [remoteResource]
	 * @param {*} [options]
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	requestConditional (uri, remoteResource, options = {}) {
		GitHubRemoteService.addConditionalHeaders(remoteResource, options);

		return this.request(uri, options).catch((error) => {
			if (error.statusCode === 304) {
				return GitHubRemoteService.processConditionalResponse(error, remoteResource);
			}

			throw error;
		});
	}

	/**
	 * @param {string} uri
	 * @param {*} options
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	async request (uri, options = {}) {
		let response, error;

		try {
			response = await this.octokit.request(uri, { ...options, request: { ...options.request, redirect: options.request?.redirect ?? 'manual' } });
		} catch (requestError) {
			error = requestError;
			response = error.response;
		}

		if ((response?.status === 301 || response?.status === 308) && response.headers.location) {
			let original = new URL(this.octokit.request.endpoint(uri, options).url);
			let destination = new URL(response.headers.location, original);
			let source = original.pathname.match(/^\/repos\/([^/]+\/[^/]+)\//)?.[1];
			let id = destination.pathname.match(/^\/repositories\/(\d+)(?:\/|$)/)?.[1];

			if (source && id && original.origin === destination.origin) {
				let redirect = await this.getRepositoryRedirect(id, decodeURIComponent(source));

				if (redirect.props.redirect.name !== decodeURIComponent(source)) {
					throw redirect;
				}
			}
		}

		// Preserve Octokit's normal redirect and authentication handling for other destinations.
		if (response?.status >= 300 && response.status < 400 && response.status !== 304 && options.request?.redirect !== 'follow') {
			return this.request(uri, { ...options, request: { ...options.request, redirect: 'follow' } });
		}

		let resource = new GitHubRemoteResource({ statusCode: response?.status ?? error?.status, headers: response?.headers, data: response?.data }, error);

		if (error) {
			throw resource;
		}

		return resource;
	}
}

export default GitHubRemoteService;
