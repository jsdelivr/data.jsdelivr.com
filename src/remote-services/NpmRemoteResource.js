const RemoteResource = require('./RemoteResource');
const twoWeeks = 14 * 24 * 60 * 60 * 1000;
const baseTtl = 5 * 60 * 1000;

class NpmRemoteResource extends RemoteResource {
	get defaultTtlInternalRevalidate () {
		if ([ 200, 404 ].includes(this.statusCode)) {
			return baseTtl;
		}

		return super.defaultTtlInternalRevalidate;
	}

	get defaultTtlInternalStore () {
		if ([ 200, 404 ].includes(this.statusCode)) {
			return twoWeeks;
		}

		return super.defaultTtlInternalStore;
	}
}

module.exports = NpmRemoteResource;
