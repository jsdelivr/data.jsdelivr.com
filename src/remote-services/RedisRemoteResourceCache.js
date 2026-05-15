import { TTLCache as TTL } from '@isaacs/ttlcache';
import { RESP_TYPES } from 'redis';
import redis from '../lib/redis/index.js';
import JSONPP from '../lib/jsonpp/index.js';
import ArrayStream from '../lib/array-stream/index.js';
const arrayStream = new ArrayStream(JSONPP);

const STATUS_PENDING = 0;
const STATUS_RESOLVED = 1;
const STATUS_REJECTED = 2;

const VALUE_TYPE_OBJECT = '0';
const VALUE_TYPE_STRING = '1';
const VALUE_TYPE_ARRAY = '2';
let promiseCacheShared;

// TODO: this is an experimental implementation based on promise-lock and shares a lot of code with it.
// If it works well it should be merged somehow.
class PromiseCacheShared {
	/**
	 * Provides a multi-process locking and caching mechanism backed by redis.
	 * @param {string} prefix
	 */
	constructor ({ prefix = 'rrrc/' } = {}) {
		this.prefix = prefix;
		this.pendingL = new TTL({ ttl: 60 * 1000 });
	}

	/**
	 * @param {string} key
	 * @returns {Promise}
	 */
	async delete (key) {
		this.pendingL.delete(key);
		return redis.del(this.getRedisKey(key));
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

		if (cached) {
			cached.v.age = cached.v.ttlInternalStore - ttl;
		}

		// Already cached.
		if (cached && !cached.v.isStale) {
			return cached.s === STATUS_REJECTED ? Bluebird.reject(cached.v) : cached.v;
		}

		let executor = fn(cached && cached.v);
		let staleIfErrorUsed = false;

		value = executor.catch((error) => {
			if (cached && cached.s === STATUS_RESOLVED && cached.v.age < cached.v.staleIfError && !error.forceCacheUpdate) {
				staleIfErrorUsed = true;
				return cached.v;
			}

			throw error;
		});

		this.pendingL.set(key, value);

		// Wrapped in Promise.resolve() to make sure it's a Bluebird promise because
		// .finally() behaves differently with some promises.
		let done = Bluebird.resolve(value).finally(() => {
			executor.then((v) => {
				return this.store({ key, v, s: STATUS_RESOLVED }, v.ttlInternalStore).then(() => {
					this.pendingL.delete(key);
				});
			}).catch((v) => {
				if (staleIfErrorUsed) {
					return this.pendingL.delete(key);
				}

				return this.store({ key, v, s: STATUS_REJECTED }, v.ttlInternalStore).then(() => {
					this.pendingL.delete(key);
				});
			});
		});

		// This will work only for the first request because the new promise
		// is added to pendingL right away. Should be ok for our use case.
		if (cached && cached.s === STATUS_RESOLVED && cached.v.age < cached.v.staleWhileRevalidate) {
			done.catch(() => {});
			return cached.v;
		}

		return done;
	}

	/**
	 * @param {string} key
	 * @returns {Promise<*>}
	 * @private
	 */
	async getCachedValue (key) {
		let rKey = this.getRedisKey(key);
		let replies = await Promise.all([
			redis.sendCommand([ 'MULTI' ]),
			redis.get(rKey),
			redis.pTTL(rKey),
			redis.sendCommand([ 'EXEC' ], { typeMapping: { [RESP_TYPES.BLOB_STRING]: Buffer } }),
		]);
		let [ value, ttl ] = replies[3];

		return value ? [ await PromiseCacheShared.parse(await redis.decompress(value)), ttl ] : [ null ];
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

		await redis.set(key, res, { PX: maxAge });
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

		if (!promiseCacheShared) {
			promiseCacheShared = new PromiseCacheShared();
		}
	}

	getOrExec (key, fn) {
		return promiseCacheShared.getOrExec(`${this.scope}${key}`, fn);
	}
}

export default ScopedPromiseCacheShared;
export { PromiseCacheShared, PromiseCacheSharedError };
