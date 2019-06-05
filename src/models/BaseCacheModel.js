const crypto = require('crypto');
const BaseModel = require('./BaseModel');
const PromiseLock = require('../lib/promise-lock');
const promiseLock = new PromiseLock('cm');

class BaseCacheModel extends BaseModel {
	static get (transformKey = '', expiration = 24 * 60 * 60, deserialize = v => v) {
		return this.transform(transformKey, v => v, expiration, deserialize);
	}

	static getWithLock (transformKey = '', expiration = 24 * 60 * 60, deserialize = v => v) {
		return this.transformWithLock(transformKey, v => v, expiration, deserialize);
	}

	static getOne (transformKey = '', callback = async v => v, expiration = 24 * 60 * 60) {
		return this.transform(transformKey, callback, expiration, v => this.fromJson(v));
	}

	static getOneWithLock (transformKey = '', callback = async v => v, expiration = 24 * 60 * 60) {
		return this.transformWithLock(transformKey, callback, expiration, v => this.fromJson(v));
	}

	static getMany (transformKey = '', callback = async v => v, expiration = 24 * 60 * 60) {
		return this.transform(transformKey, callback, expiration, a => a.map(v => this.fromJson(v)));
	}

	static getManyWithLock (transformKey = '', callback = async v => v, expiration = 24 * 60 * 60) {
		return this.transformWithLock(transformKey, callback, expiration, a => a.map(v => this.fromJson(v)));
	}

	static transform (transformKey, callback, expiration = 24 * 60 * 60, deserialize = v => v) {
		return new Proxy(new ProxyTarget(this, transformKey, callback, expiration, deserialize), BaseCacheModel.ProxyTargetHandler);
	}

	static transformWithLock (transformKey, callback, expiration = 24 * 60 * 60, deserialize = v => v) {
		return new Proxy(new ProxyTarget(this, transformKey, callback, expiration, deserialize, true), BaseCacheModel.ProxyTargetHandler);
	}
}

class ProxyTarget {
	constructor (model, transformKey, callback, expiration, deserialize, withLock) {
		this.model = model;
		this.transformKey = transformKey;
		this.callback = callback;
		this.expiration = expiration;
		this.deserialize = deserialize;
		this.withLock = withLock;
	}

	static hash (...values) {
		let normalized = values.map((value) => {
			if (value instanceof Date) {
				return value.valueOf();
			} else if (typeof value !== 'function' && _.isObject(value)) {
				return JSON.stringify(_.map(Object.keys(value).sort(), key => value[key]));
			}

			return String(value);
		}).join(':');

		return crypto.createHash('sha256').update(normalized).digest('base64');
	}
}

module.exports = BaseCacheModel;
module.exports.ProxyHandler = BaseModel.ProxyHandler;
module.exports.ProxyTargetHandler = _.defaults({
	get (target, property) {
		if (typeof target.model[property] === 'function') {
			return async (...args) => {
				let key = `${target.model.name}:${property}:${ProxyTarget.hash(...args)}:${target.transformKey}`, value;

				if (value = await redis.getCompressedAsync(key).catch(() => {})) {
					return target.deserialize(JSON.parse(value));
				}

				let execAndStore = async () => {
					let value = await target.callback(await target.model[property](...args));

					if (value) {
						let expiration = target.expiration instanceof Date ? Math.floor((target.expiration - Date.now()) / 1000) : target.expiration;
						redis.setCompressedAsync(key, JSON.stringify(value), 'EX', expiration).catch(() => {});
					}

					return value;
				};

				return target.withLock
					? promiseLock.get(key, execAndStore, undefined, true)
					: execAndStore();
			};
		}
	},
}, BaseModel.ProxyHandler);
