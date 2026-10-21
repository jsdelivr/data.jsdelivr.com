import _ from 'lodash';
import HttpLinkHeader from 'http-link-header';
import { Octokit } from '@octokit/rest';
import vCompare from 'v-compare';
import semver from 'semver';
import config from 'config';
import apmClient from 'elastic-apm-node';
import GitHubRemoteResource from './GitHubRemoteResource.js';
import RemoteService from './RemoteService.js';

const { userAgent } = config.get('server');

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
			if (!prefix) {
				firstPage = firstPage || await this.listTagsFirstPage(owner, repo, cached?.parts?.[0]);

				// Join an in-progress first-page refresh rather than caching a stale assembly.
				if (firstPage.isStale) {
					firstPage = await this.listTagsFirstPage(owner, repo, cached?.parts?.[0]);
				}
			}

			return this.paginate(uri, response => response.data.map(t => prefix ? t.ref.substring('refs/tags/'.length) : t.name), cached, firstPage).then((remoteResource) => {
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
		});
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
	 * Return normalized tag candidates, using prefix lookups only for known large repositories.
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

		// Reuse the full listing if available.
		if (await this.resourceCache.getCached(`/${owner}/${repo}`)) {
			return this.listTags(owner, repo);
		}

		let resources = [];
		let firstPage = await this.listTagsFirstPage(owner, repo);

		// Use the full listing for small repos.
		if (!firstPage.props.lastPage || firstPage.props.lastPage <= 10) {
			return this.listTags(owner, repo, undefined, firstPage);
		}

		for (let prefix of prefixes) {
			let resource = await this.listTags(owner, repo, prefix);
			resources.push(resource);

			// An exact normalized tag always wins, regardless of other matching tags.
			if (resource.data.includes(specifier)) {
				return resource;
			}
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
				return new GitHubRemoteResource({ statusCode: 200, data: response.data, headers: response.headers, props: response.props });
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
	request (uri, options) {
		return this.octokit.request(uri, options).then((response) => {
			return new GitHubRemoteResource({ statusCode: response.status, headers: response.headers, data: response.data });
		}).catch((error) => {
			throw new GitHubRemoteResource({ statusCode: error.status, headers: error.response?.headers, data: error.response?.data }, error);
		});
	}
}

export default GitHubRemoteService;
