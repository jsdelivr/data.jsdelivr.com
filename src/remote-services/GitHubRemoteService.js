import _ from 'lodash';
import HttpLinkHeader from 'http-link-header';
import { Octokit } from '@octokit/rest';
import vCompare from 'v-compare';
import semver from 'semver';
import config from 'config';
import apmClient from 'elastic-apm-node';
import { execFile } from 'child_process';
import { promisify } from 'util';
import eventLog from '../lib/event-log/index.js';
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
	 * @param {string} [prefix]
	 * @param {GitHubRemoteResource} [firstPage]
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	listTags (owner, repo, prefix, firstPage) {
		let uri = prefix
			? this.octokit.git.listMatchingRefs.endpoint({ owner, repo, ref: `tags/${prefix}` }).url
			: this.octokit.repos.listTags.endpoint({ owner, repo }).url;
		let key = prefix ? uri : `/${owner}/${repo}`;

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
					if (firstPage.isStale) {
						firstPage = await this.listTagsFirstPage(owner, repo, cached?.parts?.[0]);
					}
				}

				if (firstPage.props.lastPage > 50) {
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
		eventLog.log('GitHubRemoteService.gitTags');

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
			eventLog.log('GitHubRemoteService.gitTagsError');
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
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	async listTagsForSpecifier (owner, repo, specifier) {
		let prefixes = GitHubRemoteService.getTagPrefixes(specifier);

		if (!prefixes) {
			return this.listTags(owner, repo);
		}

		let cached = await this.resourceCache.getCached(`/${owner}/${repo}`);

		// Prefer Git-backed listings even when stale; literal lookups can bypass stale REST listings.
		if (cached && (!cached.isStale || cached.props.gitFetchedAt || cached.statusCode !== 200 || semver.validRange(specifier, { includePrerelease: true }) !== null)) {
			return this.listTags(owner, repo);
		}

		let resources = [];

		if (!cached) {
			let firstPage = await this.listTagsFirstPage(owner, repo);

			// Use the full listing for small repos.
			if (!firstPage.props.lastPage || firstPage.props.lastPage <= 10) {
				return this.listTags(owner, repo, undefined, firstPage);
			}
		}

		try {
			for (let prefix of prefixes) {
				let resource = await this.listTags(owner, repo, prefix);

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
		let conditional = Boolean(options.headers['if-none-match'] || options.headers['if-modified-since']);

		return this.request(uri, options).then((response) => {
			eventLog.log(`GitHubRemoteService.${conditional ? 'modified' : 'unconditionalResponse'}`);

			if (Array.isArray(response.data) && response.data.length === 0) {
				eventLog.log('GitHubRemoteService.emptyResult');
			}

			return response;
		}).catch((error) => {
			if (error.statusCode === 304) {
				return GitHubRemoteService.processConditionalResponse(error, remoteResource);
			}

			eventLog.log('GitHubRemoteService.requestConditionalError');
			throw error;
		});
	}

	/**
	 * @param {string} uri
	 * @param {*} options
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	request (uri, options) {
		return this.octokit.request(uri, options).then((response) => {
			return new GitHubRemoteResource({ statusCode: response.status, headers: response.headers, data: response.data });
		}).catch((error) => {
			throw new GitHubRemoteResource({ statusCode: error.status, headers: error.response?.headers, data: error.response?.data }, error);
		});
	}
}

export default GitHubRemoteService;
