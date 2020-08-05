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

	requestWithCache (uri, exec) {
		return this.resourceCache.getOrExec(uri, (cached) => {
			return exec(uri, cached);
		});
	}
}

module.exports = RemoteService;
