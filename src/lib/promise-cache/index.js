const TTL = require('@isaacs/ttlcache');

class PromiseCache {
	constructor ({ ttl }) {
		this.ttl = new TTL({ ttl });
	}

	delete (key) {
		this.ttl.del(key);
	}

	get (key, fn) {
		let value = this.ttl.get(key);

		if (value) {
			return value;
		}

		value = fn();
		this.ttl.set(key, value);
		return value;
	}
}

module.exports = PromiseCache;
