const got = require('../lib/got');
const promiseRetry = require('promise-retry');

const JsDelivrRemoteResource = require('./JsDelivrRemoteResource');
const RemoteService = require('./RemoteService');

class JsDelivrRemoteService extends RemoteService {
	constructor ({ baseUrl }, resourceCache) {
		super(resourceCache);
		this.baseUrl = baseUrl;
	}

	/**
	 * @param {string} type
	 * @param {string} name
	 * @param {string} version
	 * @returns {Promise<JsDelivrRemoteResource>}
	 */
	listFiles (type, name, version) {
		return this.requestWithCache(`/${type}/${name}@${encodeURIComponent(version)}/+private-json`, (uri, cached) => {
			return this.requestConditional(uri, cached, { json: true }).then((remoteResource) => {
				if (remoteResource.isFromCache) {
					return remoteResource;
				}

				return Object.assign(remoteResource, {
					data: _.pick(remoteResource.data, [ 'default', 'files', 'version' ]),
					headers: _.pick(remoteResource.headers, 'etag', 'last-modified'),
				});
			}).catch((error) => {
				if (error.statusCode === 403) {
					Object.assign(error, {
						data: { status: error.statusCode, message: error.data },
						headers: _.pick(error.headers, 'etag', 'last-modified'),
					});

					return error;
				}

				throw error;
			});
		});
	}

	/**
	 * @param {string} uri
	 * @param {RemoteResource|null} [remoteResource]
	 * @param options
	 * @returns {Promise<JsDelivrRemoteResource>}
	 */
	requestConditional (uri, remoteResource, options = {}) {
		JsDelivrRemoteService.addConditionalHeaders(remoteResource, options);

		return this.request(uri, options).then((response) => {
			return JsDelivrRemoteService.processConditionalResponse(response, remoteResource);
		});
	}

	/**
	 * @param {string} uri
	 * @param {*} options
	 * @returns {Promise<JsDelivrRemoteResource>}
	 */
	request (uri, options) {
		return promiseRetry((retry) => {
			return got(`${this.baseUrl}${uri}`, Object.assign({ timeout: 30000 }, options)).catch((error) => {
				if (error instanceof got.ParseError) {
					return retry(error);
				}

				throw error;
			});
		}, { retries: 2 }).then((response) => {
			return new JsDelivrRemoteResource({ statusCode: response.statusCode, headers: response.headers, data: response.body });
		}).catch((error) => {
			throw new JsDelivrRemoteResource({ statusCode: error.statusCode, headers: error.headers, data: error.body }, error);
		});
	}
}

module.exports = JsDelivrRemoteService;
