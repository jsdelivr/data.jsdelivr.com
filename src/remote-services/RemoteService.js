class RemoteService {
	constructor (resourceCache) {
		this.resourceCache = resourceCache;
	}

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

	static processConditionalResponse (response, cached) {
		if (response.statusCode !== 304) {
			return response;
		}

		if (cached.statusCode < 200 || cached.statusCode >= 400) {
			throw cached;
		}

		return cached;
	}

	requestWithCache (uri, exec) {
		return this.resourceCache.getOrExec(uri, (cached) => {
			return exec(uri, cached);
		});
	}

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
						return processResource(remoteResource).data;
					}).catch((error) => {
						throw processResource(error);
					});
				};
			},
		});
	}
}

module.exports = RemoteService;
