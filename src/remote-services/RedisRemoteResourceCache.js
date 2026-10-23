import Bluebird from 'bluebird';
import { TTLCache as TTL } from '@isaacs/ttlcache';
import { RESP_TYPES } from 'redis';
import apmClient from 'elastic-apm-node';
import redis from '../lib/redis/index.js';
import eventLog from '../lib/event-log/index.js';
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

/**
 * @param {string} key
 * @returns {string} Bounded metric family, matching origin where applicable.
 */
function getMetricFamily (key) {
	return key.startsWith('pr/gh/') ? 'gh' : key.startsWith('pr/npm/') ? 'npm' : key.startsWith('pr/jsd/') ? 'jsd' : 'other';
}

/**
 * @param {string} key
 * @returns {string} Bounded GitHub cache kind.
 */
function getCacheKind (key) {
	return getMetricFamily(key) !== 'gh' ? 'resource' : key.includes('/git/matching-refs/') ? 'prefix' : key.includes('/tags?') ? 'firstPage' : 'full';
}

/**
 * @param {string} key
 * @param {string} event
 */
function logCacheEvent (key, event) {
	// Keep origin's totals; GitHub cache kinds provide an additional bounded breakdown.
	let family = getMetricFamily(key);
	eventLog.log(`lock.${family}.${event}`);

	if (family === 'gh') {
		eventLog.log(`lock.gh.${getCacheKind(key)}.${event}`);
	}
}

/**
 * @param {string} name
 * @param {string} key
 * @returns {import('elastic-apm-node').Span|null}
 */
function startCacheSpan (name, key) {
	let span = apmClient.startSpan(name, 'app', 'cache');
	span?.addLabels({ cacheFamily: getMetricFamily(key), cacheKind: getCacheKind(key) });
	return span;
}

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
	 * Read a completed success or error resource without waiting for or starting a refresh.
	 * @param {string} key
	 * @returns {Promise<RemoteResource|null>} Resource with its current age, including stale entries, or null on a cache miss.
	 */
	async getCached (key) {
		logCacheEvent(key, 'peek.get');
		let [ cached, ttl ] = await this.getCachedValue(key, 'peek');

		if (cached) {
			cached.v.age = cached.v.ttlInternalStore - ttl;
		}

		logCacheEvent(key, cached ? cached.v.isStale ? 'peek.stale' : 'peek.fresh' : 'peek.miss');
		return cached && cached.v;
	}

	/**
	 * @param {string} key
	 * @param {function} fn
	 * @returns {Promise<*>}
	 */
	async getOrExec (key, fn) {
		logCacheEvent(key, 'get');
		let value = this.pendingL.get(key);

		if (value) {
			logCacheEvent(key, 'cache');
			logCacheEvent(key, 'pending');
			// Keep the span's active context out of the caller's async continuation.
			await Promise.resolve();
			let span = startCacheSpan('cache.lookup', key);
			span?.addLabels({ cacheResult: 'pending', cacheOperation: 'get' });

			try {
				return await value;
			} catch (error) {
				span?.setOutcome('failure');
				throw error;
			} finally {
				span?.end();
			}
		}

		let [ cached, ttl ] = await this.getCachedValue(key);

		if (cached) {
			cached.v.age = cached.v.ttlInternalStore - ttl;
		}

		// Already cached.
		if (cached && !cached.v.isStale) {
			logCacheEvent(key, 'cache');
			logCacheEvent(key, 'fresh');
			return cached.s === STATUS_REJECTED ? Bluebird.reject(cached.v) : cached.v;
		}

		logCacheEvent(key, 'exec');
		logCacheEvent(key, cached ? 'stale' : 'miss');
		let refreshSpan = startCacheSpan('cache.refresh', key);
		refreshSpan?.addLabels({ cacheResult: cached ? 'stale' : 'miss', staleWhileRevalidate: false, staleIfError: false, cacheStored: false }, false);
		let executor;

		try {
			executor = fn(cached && cached.v);
		} catch (error) {
			refreshSpan?.setOutcome('failure');
			refreshSpan?.end();
			throw error;
		}

		let staleIfErrorUsed = false;

		value = executor.catch((error) => {
			refreshSpan?.setOutcome('failure');

			if (cached && cached.s === STATUS_RESOLVED && cached.v.age < cached.v.staleIfError && !error.forceCacheUpdate) {
				logCacheEvent(key, 'staleIfError');
				refreshSpan?.setLabel('staleIfError', true, false);
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
				refreshSpan?.addLabels({ cacheStatus: v.statusCode, cacheEmptyResult: Array.isArray(v.data) && v.data.length === 0 }, false);
				return this.store({ key, v, s: STATUS_RESOLVED }, v.ttlInternalStore).then(() => {
					refreshSpan?.setLabel('cacheStored', Boolean(v.ttlInternalStore), false);
					refreshSpan?.end();
					this.pendingL.delete(key);
				});
			}).catch((v) => {
				refreshSpan?.setOutcome('failure');
				refreshSpan?.setLabel('cacheStatus', v.statusCode || 0, false);

				if (staleIfErrorUsed) {
					refreshSpan?.end();
					return this.pendingL.delete(key);
				}

				return this.store({ key, v, s: STATUS_REJECTED }, v.ttlInternalStore).then(() => {
					refreshSpan?.setLabel('cacheStored', Boolean(v.ttlInternalStore), false);
					refreshSpan?.end();
					this.pendingL.delete(key);
				}, (error) => {
					refreshSpan?.end();
					throw error;
				});
			});
		});

		// This will work only for the first request because the new promise
		// is added to pendingL right away. Should be ok for our use case.
		if (cached && cached.s === STATUS_RESOLVED && cached.v.age < cached.v.staleWhileRevalidate) {
			logCacheEvent(key, 'staleWhileRevalidate');
			refreshSpan?.setLabel('staleWhileRevalidate', true, false);
			done.catch(() => {});
			return cached.v;
		}

		return done;
	}

	/**
	 * @param {string} key
	 * @param {string} [operation] Normal lookup or a read-only cache inspection.
	 * @returns {Promise<*>}
	 * @private
	 */
	async getCachedValue (key, operation = 'get') {
		// Starting before the first await would also change the caller's active span.
		await Promise.resolve();
		let span = startCacheSpan('cache.lookup', key);
		span?.setLabel('cacheOperation', operation);
		let rKey = this.getRedisKey(key);
		let family = getMetricFamily(key);

		try {
			let replies = await Promise.all([
				redis.sendCommand([ 'MULTI' ]),
				redis.get(rKey),
				redis.pTTL(rKey),
				redis.sendCommand([ 'EXEC' ], { typeMapping: { [RESP_TYPES.BLOB_STRING]: Buffer } }),
			]);
			let [ value, ttl ] = replies[3];

			let cached = value ? await PromiseCacheShared.parse(await redis.decompress(value, family), family) : null;
			let age = cached ? cached.v.ttlInternalStore - ttl : 0;
			span?.setLabel('cacheResult', cached ? age > cached.v.ttlInternalRevalidate ? 'stale' : 'fresh' : 'miss');

			if (cached) {
				span?.addLabels({ cacheAgeMs: age, cacheFreshnessMs: cached.v.ttlInternalRevalidate, cacheStatus: cached.v.statusCode, cacheEmptyResult: Array.isArray(cached.v.data) && cached.v.data.length === 0 }, false);
			}

			return cached ? [ cached, ttl ] : [ null ];
		} catch (error) {
			span?.setOutcome('failure');
			throw error;
		} finally {
			span?.end();
		}
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
		let res = await redis.compress(await PromiseCacheShared.serialize(message), getMetricFamily(message.key));

		await redis.set(key, res, { PX: maxAge });
	}

	/**
	 * @param {string} string
	 * @param {string} [family] Bounded cache family, known before decoding the value.
	 * @returns {Object}
	 */
	static async parse (string, family = 'other') {
		let i = string.indexOf('\n');
		let o = JSONPP.parse(string.substr(0, i));
		let metric = `workload.cache.${o.k ? getMetricFamily(o.k) : family}.redis.parse`;
		eventLog.log(`${metric}.operations`).log(`${metric}.characters`, string.length);

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
		let metric = `workload.cache.${getMetricFamily(message.key)}.serialize`;
		eventLog.log(`${metric}.operations`);
		let serializedValue;

		if (typeof message.v === 'string') {
			serializedValue = VALUE_TYPE_STRING + message.v;
		} else if (Array.isArray(message.v)) {
			serializedValue = VALUE_TYPE_ARRAY + await arrayStream.stringify(message.v);
		} else {
			serializedValue = VALUE_TYPE_OBJECT + JSONPP.stringify(message.v);
		}

		let serialized = JSONPP.stringify({ s: message.s, k: message.key })
			+ '\n'
			+ serializedValue;
		eventLog.log(`${metric}.characters`, serialized.length);
		return serialized;
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

	/**
	 * Read a completed resource within this cache scope without refreshing it.
	 * @param {string} key
	 * @returns {Promise<RemoteResource|null>}
	 */
	getCached (key) {
		return promiseCacheShared.getCached(`${this.scope}${key}`);
	}
}

export default ScopedPromiseCacheShared;
export { PromiseCacheShared, PromiseCacheSharedError };
