const LRU = require('lru-cache');

class PromiseCache {
	constructor ({ maxAge }) {
		this.lru = new LRU({ maxAge });
	}

	autoClear () {
		setInterval(() => {
			this.lru.prune();
		}, 60 * 1000);

		return this;
	}

	delete (key) {
		this.lru.del(key);
	}

	get (key, fn) {
		let value = this.lru.get(key);

		if (value) {
			return value;
		}

		value = fn();
		this.lru.set(key, value);
		return value;
	}
}

module.exports = PromiseCache;
