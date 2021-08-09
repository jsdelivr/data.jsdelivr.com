const HttpLinkHeader = require('http-link-header');
const { Octokit } = require('@octokit/rest');
const vCompare = require('v-compare');
const config = require('config');

const GitHubRemoteResource = require('./GitHubRemoteResource');
const RemoteService = require('./RemoteService');

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
		});
	}

	/**
	 * @param {string} owner
	 * @param {string} repo
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	listTags (owner, repo) {
		return this.requestWithCache(`/${owner}/${repo}`, (uri, cached) => {
			return this.paginate(this.octokit.repos.listTags.endpoint({ owner, repo }).url, response => response.data.map(t => t.name), cached).then((remoteResource) => {
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
	 * @param {string} uri
	 * @param {function} mapper
	 * @param {GitHubRemoteResource|null} [cached]
	 * @returns {Promise<GitHubRemoteResource>}
	 */
	paginate (uri, mapper, cached) {
		let i = 0;
		let f = (uri, data = [], parts = []) => {
			let remoteResourcePart = cached && cached.parts && cached.parts[i];
			i++;

			return this.requestConditional(uri, remoteResourcePart, { per_page: 100 }).then((response) => {
				let part, next;

				if (response.isFromCache) {
					part = response;
					next = response.props.next;
				} else {
					if (response.headers.link) {
						next = new HttpLinkHeader(response.headers.link).rel('next')[0];
					}

					part = Object.assign(response, { data: mapper(response), headers: _.pick(response.headers, 'etag', 'last-modified') });

					if (next) {
						part.props.next = next = next.uri;
					}
				}

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
	 * @param {GitHubRemoteResource|null} [remoteResource]
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
			throw new GitHubRemoteResource({ statusCode: error.status, headers: error.response.headers }, error);
		});
	}
}

module.exports = GitHubRemoteService;
