import RemoteResource from './RemoteResource.js';
const baseTtl = 5 * 60 * 1000;

class JsDelivrRemoteResource extends RemoteResource {
	get defaultTtlInternalRevalidate () {
		if ([ 200, 403, 404 ].includes(this.statusCode)) {
			return baseTtl;
		}

		return 0;
	}

	get defaultTtlInternalStore () {
		return this.ttlInternalRevalidate;
	}
}

export default JsDelivrRemoteResource;
