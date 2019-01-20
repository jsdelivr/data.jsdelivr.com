const LRU = require('lru-cache');
const pTimeout = require('p-timeout');
const redis = require('../redis');
const createRedisClient = require('../redis').createClient;
const JSONPP = require('../jsonpp');

const STATUS_PENDING = 0;
const STATUS_RESOLVED = 1;
const STATUS_REJECTED = 2;

let lastMessageId = 0;
let getNextMessageId = () => ++lastMessageId % Number.MAX_SAFE_INTEGER;

class PromiseLock {
	/**
	 * Provides a multi-process locking and caching mechanism backed by redis.
	 * @param {string} prefix
	 * @param {string} channel
	 */
	constructor ({ prefix = 'pl/', channel = `promise-lock-${process.env.NODE_ENV}` } = {}) {
		this.prefix = prefix;
		this.channel = channel;

		this.messages = new LRU({ maxAge: 60 * 1000 });
		this.pendingR = new LRU({});
		this.pendingL = new LRU({});
		this.pubClient = createRedisClient();
		this.subClient = createRedisClient();

		this.subClient.on('message', (channel, message) => this.onMessage(channel, message));
		this.subClient.on('ready', () => this.subClient.subscribe(this.channel));
	}

	autoClear () {
		// istanbul ignore next
		setInterval(() => {
			this.messages.prune();
			this.pendingR.prune();
			this.pendingL.prune();
		}, 60 * 1000);

		return this;
	}

	/**
	 * Calling this is NOT safe if the promise is in pending state.
	 * @param {string} key
	 * @returns {Promise}
	 */
	async delete (key) {
		this.pendingR.del(key);
		this.pendingL.del(key);
		return redis.delAsync(this.getRedisKey(key));
	}

	/**
	 * @param {*} value
	 * @returns {*}
	 */
	static ensureSerializable (value) {
		if (JSONPP.isSerializable(value)) {
			return value;
		}

		return new PromiseLockError(value);
	}

	/**
	 * Returns the stored value for the given key from cache or executes fn() if it is not cached.
	 * Guarantees that there are no concurrent calls of fn() across all processes.
	 *
	 * @param {string} key
	 * @param {function} fn
	 * @param {number} [maxAge]
	 * @param {boolean} [lockOnly] - if true the result is removed from cache shortly after fn() finishes
	 * @returns {Promise<*>}
	 */
	async get (key, fn, maxAge = 10 * 60 * 1000, lockOnly = false) {
		// This is just an optimization.
		let value = this.pendingL.get(key);

		if (value) {
			return value;
		}

		let idBeforeLock = lastMessageId;
		let lock = await this.getLockOrValue(key, maxAge);

		// Already running in another process.
		if (lock !== null) {
			// Unlike the previous one, this check is important.
			// this.getLockOrValue() is async so we could end up here multiple times in the same process.
			value = this.pendingL.get(key);

			if (value) {
				return value;
			}

			// Already resolved.
			if (lock.s !== STATUS_PENDING) {
				return lock.s === STATUS_REJECTED ? Promise.reject(lock.v) : lock.v;
			}

			// Wait for a notification from another process.
			value = pTimeout(new Promise((resolve, reject) => {
				// While getLockOrValue() is atomic at redis level, the communication with redis is asynchronous, so something like this might happen:
				//   1. getLockOrValue() is executed in redis and the result is STATUS_PENDING.
				//   2. The fn() call finishes in another process and that process notifies other processes.
				//   3. This process gets the notification via onMessage() sooner than it gets the response from getLockOrValue(),
				//      so the message is ignored, because there isn't a pending promise in pendingR yet.
				//   4. getLockOrValue() is resolved with STATUS_PENDING and a promise is added to pendingR. However, onMessage()
				//      has already been called, so the promise will keep waiting for a message which will never come.
				//
				// Another issue here is that the executor function of new Promise() is called asynchronously,
				// so pendingR might be set too late, resulting in a scenario similar to above.
				//
				// To solve both of those problems, we keep track of all messages received in the last 60 seconds
				// and if there is one for our key received between the time getLockOrValue() was called and now
				// we immediately resolve with its value, rather than waiting for another onMessage() which would never come.
				let message = this.messages.get(key);

				// istanbul ignore next
				if (message && message.id > idBeforeLock) {
					if (message.s === STATUS_RESOLVED) {
						resolve(message.v);
					} else {
						reject(message.v);
					}

					return;
				}

				this.pendingR.set(key, { resolve, reject }, maxAge);
			}), maxAge);

			// Cache the promise to make sure we don't create multiple for the same key.
			this.pendingL.set(key, value, maxAge);

			return value;
		}

		value = fn();
		this.pendingL.set(key, value, maxAge);

		// Wrapped in Promise.resolve() to make sure it's a Bluebird promise because
		// .finally() behaves differently with some promises.
		return Promise.resolve(value).finally(() => {
			value.then((v) => {
				return this.notify({ key, v, s: STATUS_RESOLVED }).then(() => {
					if (lockOnly) {
						return this.delete(key);
					}
				});
			}).catch((v) => {
				return this.notify({ key, s: STATUS_REJECTED, v: PromiseLock.ensureSerializable(v) }).then(() => this.delete(key));
			});
		});
	}

	/**
	 * @param {string} key
	 * @param {number} maxAge
	 * @returns {Promise<*>}
	 * @private
	 */
	async getLockOrValue (key, maxAge) {
		let rKey = this.getRedisKey(key);
		let result = await redis.multi().set(rKey, '{"s":0}', 'PX', maxAge, 'NX').get(rKey).execAsync();
		return result[0] === null ? JSONPP.parse(result[1]) : null;
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
	 * Handles notifications received from redis.
	 * @param {string} channel
	 * @param {string} messageString
	 * @private
	 */
	onMessage (channel, messageString) {
		let message = JSONPP.parse(messageString);
		let pending = this.pendingR.get(message.k);

		if (pending) {
			if (message.s === STATUS_RESOLVED) {
				pending.resolve(message.v);
			} else {
				pending.reject(message.v);
			}
		}

		this.messages.set(message.k, Object.assign({ id: getNextMessageId() }, message));
		this.pendingR.del(message.k);
		this.pendingL.del(message.k);
	}

	/**
	 * @param {{ key: string, s: number, v: * }} message
	 * @returns {Promise}
	 * @private
	 */
	async notify (message) {
		let key = this.getRedisKey(message.key);
		let ttl = await redis.pttlAsync(key);
		let res = JSONPP.stringify({ s: message.s, k: message.key, v: message.v });

		// Store result in redis so that we can resolve future promises.
		// istanbul ignore else
		if (ttl > 0) {
			await redis.setAsync(key, res, 'PX', ttl, 'XX');
		} else if (ttl === -1) {
			await redis.setAsync(key, res, 'XX');
		}

		// Resolve existing promises in other processes and this process.
		let args = [ this.channel, res ];
		this.pubClient.publish(...args);
		this.onMessage(...args);
	}
}

class PromiseLockError extends Error {
	constructor (originalError) {
		super();

		this.name = this.constructor.name;
		this.message = `Rejected with: ${originalError && originalError.message ? originalError.message : 'unknown error'}`;
	}

	static fromJSON (props) {
		return Object.assign(new this(), props);
	}
}

class ScopedLock {
	constructor (scope) {
		this.scope = scope;

		if (typeof module.exports.promiseLock === 'undefined') {
			module.exports.promiseLock = new PromiseLock().autoClear();
		}
	}

	get (key, fn, maxAge, lockOnly) {
		return module.exports.promiseLock.get(`${this.scope}/` + key, fn, maxAge, lockOnly);
	}
}

module.exports = ScopedLock;
module.exports.PromiseLock = PromiseLock;
module.exports.PromiseLockError = PromiseLockError;
