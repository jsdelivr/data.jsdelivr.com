const got = require('got');
const semver = require('semver');

const NpmRemoteResource = require('./NpmRemoteResource');
const RemoteService = require('./RemoteService');

class NpmRemoteService extends RemoteService {
	constructor ({ baseUrl }, resourceCache) {
		super(resourceCache);
		this.baseUrl = Array.isArray(baseUrl) ? baseUrl : [ baseUrl ];
	}

	listVersionsAndTags (name) {
		name = name.charAt(0) === '@' ? '@' + encodeURIComponent(name.substr(1)) : encodeURIComponent(name);

		return this.requestWithCache(`/${name}`, (uri, cached) => {
			return this.requestConditional(uri, cached, { json: true }).then((remoteResource) => {
				if (remoteResource.isFromCache) {
					return remoteResource;
				}

				// This happens e.g. when a package is unpublished.
				if (!remoteResource.data.versions || !Object.keys(remoteResource.data.versions).length) {
					throw Object.assign(remoteResource, {
						statusCode: 404,
						headers: _.pick(remoteResource.headers, 'etag', 'last-modified'),
						data: {},
					});
				}

				return Object.assign(remoteResource, {
					data: {
						tags: remoteResource.data['dist-tags'],
						versions: Object.keys(remoteResource.data.versions).sort(semver.rcompare),
					},
					headers: _.pick(remoteResource.headers, 'etag', 'last-modified'),
				});
			});
		});
	}

	requestConditional (uri, remoteResource, options = {}) {
		NpmRemoteService.addConditionalHeaders(remoteResource, options);

		return this.request(uri, options).then((response) => {
			return NpmRemoteService.processConditionalResponse(response, remoteResource);
		});
	}

	request (uri, options) {
		return Bluebird.any(_.map(this.baseUrl, (baseUrl) => {
			return got(`${baseUrl}${uri}`, Object.assign({ timeout: 30000 }, options));
		})).catch((e) => {
			throw e[0]; // throw one of the original errors instead of bluebird's AggregateError
		}).then((response) => {
			return new NpmRemoteResource({ statusCode: response.statusCode, headers: response.headers, data: response.body });
		}).catch((error) => {
			throw new NpmRemoteResource({ statusCode: error.statusCode, headers: error.headers, data: error.body }, error);
		});
	}
}

module.exports = NpmRemoteService;
