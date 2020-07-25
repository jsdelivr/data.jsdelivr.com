const LRU = require('lru-cache');
const redis = require('../redis');
const JSONPP = require('../jsonpp');

const ArrayStream = require('../array-stream');
const arrayStream = new ArrayStream(JSONPP);

const STATUS_PENDING = 0;
const STATUS_RESOLVED = 1;
const STATUS_REJECTED = 2;

const VALUE_TYPE_OBJECT = '0';
const VALUE_TYPE_STRING = '1';
const VALUE_TYPE_ARRAY = '2';

class PromiseCacheShared {
	/**
	 * Provides a multi-process locking and caching mechanism backed by redis.
	 * @param {string} prefix
	 */
	constructor ({ prefix = 'pc/' } = {}) {
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
	 * Returns the stored value for the given key from cache or executes fn() if it is not cached.
	 * Guarantees that there are no concurrent calls of fn() across all processes.
	 *
	 * @param {string} key
	 * @param {function} fn
	 * @param {number} [maxAge]
	 * @returns {Promise<*>}
	 */
	async get (key, fn, maxAge = 10 * 60) {
		let value = this.pendingL.get(key);

		if (value) {
			return value;
		}

		value = await this.getCachedValue(key);

		// Already cached.
		if (value !== null) {
			return value.s === STATUS_REJECTED ? Bluebird.reject(value.v) : value.v;
		}

		let forceCache;

		value = fn((data, newMaxAge = maxAge) => {
			forceCache = data;
			maxAge = newMaxAge;
		});

		this.pendingL.set(key, value, maxAge * 1000);

		// Wrapped in Promise.resolve() to make sure it's a Bluebird promise because
		// .finally() behaves differently with some promises.
		return Bluebird.resolve(value).finally(() => {
			value.then((v) => {
				return this.store({ key, v, s: STATUS_RESOLVED }, maxAge).then(() => {
					this.pendingL.del(key);
				});
			}).catch(() => {
				if (forceCache) {
					return this.store({ key, v: forceCache, s: STATUS_REJECTED }, maxAge).then(() => {
						this.pendingL.del(key);
					});
				}

				this.pendingL.del(key);
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
		let result = await redis.getCompressedAsync(rKey);
		return result ? PromiseCacheShared.parse(result) : null;
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

	get (key, fn, maxAge) {
		return module.exports.promiseCacheShared.get(`${this.scope}/${key}`, fn, maxAge);
	}

	refresh (key, maxAge) {
		return redis.eexpireAsync(module.exports.promiseCacheShared.getRedisKey(`${this.scope}/${key}`), maxAge);
	}
}

module.exports = ScopedPromiseCacheShared;
module.exports.PromiseCacheShared = PromiseCacheShared;
module.exports.PromiseCacheSharedError = PromiseCacheSharedError;
