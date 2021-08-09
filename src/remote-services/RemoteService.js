class RemoteService {
	constructor (resourceCache) {
		this.resourceCache = resourceCache;
	}

	/**
	 * @param {RemoteResource|null} [remoteResource]
	 * @param {*} options
	 * @returns {*}
	 */
	static addConditionalHeaders (remoteResource, options) {
		if (!options.headers) {
			options.headers = {};
		}

		if (remoteResource && remoteResource.headers) {
			if (remoteResource.headers.etag) {
				options.headers['if-none-match'] = remoteResource.headers.etag;
			}

			if (remoteResource.headers['last-modified']) {
				options.headers['if-modified-since'] = remoteResource.headers['last-modified'];
			}
		}

		return options;
	}

	/**
	 * @param {RemoteResource} response
	 * @param {RemoteResource|null} [cached]
	 * @returns {*}
	 */
	static processConditionalResponse (response, cached) {
		if (!cached || response.statusCode !== 304) {
			return response;
		}

		if (cached.statusCode < 200 || cached.statusCode >= 400) {
			throw cached;
		}

		return cached;
	}

	/**
	 * @param {string} uri
	 * @param {function} exec
	 * @returns {Promise<RemoteResource>}
	 */
	requestWithCache (uri, exec) {
		return this.resourceCache.getOrExec(uri, (cached) => {
			return exec(uri, cached);
		});
	}

	/**
	 * @param {RouterContext} ctx
	 * @returns {this}
	 */
	usingContext (ctx) {
		return new Proxy(this, {
			get (target, property) {
				if (typeof target[property] !== 'function') {
					return target[property];
				}

				let processResource = (remoteResource) => {
					if (remoteResource.isStale) {
						ctx.isStale = true;
					}

					return remoteResource;
				};

				return (...args) => {
					return target[property](...args).then((remoteResource) => {
						return processResource(remoteResource);
					}).catch((error) => {
						throw processResource(error);
					});
				};
			},
		});
	}
}

module.exports = RemoteService;
