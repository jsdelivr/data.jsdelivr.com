const RemoteResource = require('./RemoteResource');
const oneDay = 24 * 60 * 60;
const baseTtl = 5 * 60;

class NpmRemoteResource extends RemoteResource {
	get defaultTtlInternalRevalidate () {
		if ([ 200, 404 ].includes(this.statusCode)) {
			return baseTtl;
		}

		return 0;
	}

	get defaultTtlInternalStore () {
		if ([ 200, 404 ].includes(this.statusCode)) {
			return oneDay;
		}

		return this.ttlInternalRevalidate;
	}
}

module.exports = NpmRemoteResource;
