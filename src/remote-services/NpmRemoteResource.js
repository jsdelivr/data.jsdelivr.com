const RemoteResource = require('./RemoteResource');
const oneWeek = 7 * 24 * 60 * 60 * 1000;
const baseTtl = 5 * 60 * 1000;

class NpmRemoteResource extends RemoteResource {
	get defaultTtlInternalRevalidate () {
		if ([ 200, 404 ].includes(this.statusCode)) {
			return baseTtl;
		}

		return 0;
	}

	get defaultTtlInternalStore () {
		if ([ 200, 404 ].includes(this.statusCode)) {
			return oneWeek;
		}

		return this.ttlInternalRevalidate;
	}
}

module.exports = NpmRemoteResource;
