const LRU = require('lru-cache');
const redis = require('../lib/redis');
const JSONPP = require('../lib/jsonpp');

const ArrayStream = require('../lib/array-stream');
const arrayStream = new ArrayStream(JSONPP);

const STATUS_PENDING = 0;
const STATUS_RESOLVED = 1;
const STATUS_REJECTED = 2;

const VALUE_TYPE_OBJECT = '0';
const VALUE_TYPE_STRING = '1';
const VALUE_TYPE_ARRAY = '2';

// TODO: this is an experimental implementation based on promise-lock and shares a lot of code with it.
// If it works well it should be merged somehow.
class PromiseCacheShared {
	/**
	 * Provides a multi-process locking and caching mechanism backed by redis.
	 * @param {string} prefix
	 */
	constructor ({ prefix = 'rrrc/' } = {}) {
		this.prefix = prefix;
		this.pendingL = new LRU({});
	}

	autoClear () {
		// istanbul ignore next
		setInterval(() => {
			this.pendingL.prune();
		}, 60 * 1000);

		return this;
	}

	/**
	 * @param {string} key
	 * @returns {Promise}
	 */
	async delete (key) {
		this.pendingL.del(key);
		return redis.delAsync(this.getRedisKey(key));
	}

	/**
	 * @param {string} key
	 * @param {function} fn
	 * @returns {Promise<*>}
	 */
	async getOrExec (key, fn) {
		let value = this.pendingL.get(key);

		if (value) {
			return value;
		}

		let [ cached, ttl ] = await this.getCachedValue(key);

		// Already cached.
		if (cached !== null && cached.v.ttlInternalStore - ttl <= cached.v.ttlInternalRevalidate) {
			return cached.s === STATUS_REJECTED ? Bluebird.reject(cached.v) : cached.v;
		}

		value = fn(cached && cached.v);

		this.pendingL.set(key, value, value.ttlInternalStore * 1000);

		// Wrapped in Promise.resolve() to make sure it's a Bluebird promise because
		// .finally() behaves differently with some promises.
		return Bluebird.resolve(value).finally(() => {
			value.then((v) => {
				return this.store({ key, v, s: STATUS_RESOLVED }, v.ttlInternalStore).then(() => {
					this.pendingL.del(key);
				});
			}).catch((v) => {
				return this.store({ key, v, s: STATUS_REJECTED }, v.ttlInternalStore).then(() => {
					this.pendingL.del(key);
				});
			});
		});
	}

	/**
	 * @param {string} key
	 * @returns {Promise<*>}
	 * @private
	 */
	async getCachedValue (key) {
		let rKey = this.getRedisKey(key);
		let result = await redis.multi().get(rKey).ttl(rKey).execAsync();
		return result[0] ? [ await PromiseCacheShared.parse(await redis.decompress(result[0])), result[1] ] : [ null ];
	}

	/**
	 * @param {string} key
	 * @returns {string}
	 * @private
	 */
	getRedisKey (key) {
		return this.prefix + key;
	}

	/**
	 * @param {{ key: string, s: number, v: * }} message
	 * @param maxAge
	 * @returns {Promise}
	 * @private
	 */
	async store (message, maxAge) {
		if (!maxAge) {
			return;
		}

		let key = this.getRedisKey(message.key);
		let res = await redis.compress(await PromiseCacheShared.serialize(message));

		await redis.setAsync(key, res, 'EX', maxAge);
	}

	/**
	 * @param string
	 * @returns {Object}
	 */
	static async parse (string) {
		let i = string.indexOf('\n');
		let o = JSONPP.parse(string.substr(0, i));

		if (o.s === STATUS_PENDING) {
			return o;
		}

		let t = string.charAt(i + 1);
		let v = string.substr(i + 2);

		if (t === VALUE_TYPE_STRING) {
			o.v = v;
		} else if (t === VALUE_TYPE_ARRAY) {
			o.v = await arrayStream.parse(v);
		} else {
			o.v = JSONPP.parse(v);
		}

		return o;
	}

	/**
	 * @param {Object} message
	 * @returns {string}
	 */
	static async serialize (message) {
		let serializedValue;

		if (typeof message.v === 'string') {
			serializedValue = VALUE_TYPE_STRING + message.v;
		} else if (Array.isArray(message.v)) {
			serializedValue = VALUE_TYPE_ARRAY + await arrayStream.stringify(message.v);
		} else {
			serializedValue = VALUE_TYPE_OBJECT + JSONPP.stringify(message.v);
		}

		return JSONPP.stringify({ s: message.s, k: message.key })
			+ '\n'
			+ serializedValue;
	}
}

class PromiseCacheSharedError extends Error {
	constructor (originalError) {
		super();

		this.name = this.constructor.name;
		this.message = `Rejected with: ${originalError && originalError.message ? originalError.message : 'unknown error'}`;
	}

	static fromJSON (props) {
		return Object.assign(new this(), props);
	}
}

class ScopedPromiseCacheShared {
	constructor (scope) {
		this.scope = scope;

		if (typeof module.exports.promiseCacheShared === 'undefined') {
			module.exports.promiseCacheShared = new PromiseCacheShared().autoClear();
		}
	}

	getOrExec (key, fn) {
		return module.exports.promiseCacheShared.getOrExec(`${this.scope}${key}`, fn);
	}
}

module.exports = ScopedPromiseCacheShared;
module.exports.PromiseCacheShared = PromiseCacheShared;
module.exports.PromiseCacheSharedError = PromiseCacheSharedError;
