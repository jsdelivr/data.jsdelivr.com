const crypto = require('crypto');
const config = require('config');

const BaseModel = require('./BaseModel');
const ArrayStream = require('../lib/array-stream');

let arrayStream = new ArrayStream(JSON);
let PromiseLock, promiseLock;

if (config.has('redis')) {
	PromiseLock = require('../lib/promise-lock');
	promiseLock = new PromiseLock('cm');
}

class BaseCacheModel extends BaseModel {
	static exec () {}

	static get (transformKey = '', expiration = 24 * 60 * 60, deserialize = v => v) {
		return this.transform(transformKey, v => v, expiration, deserialize);
	}

	static getOne (transformKey = '', callback = async v => v, expiration = 24 * 60 * 60) {
		return this.transform(transformKey, callback, expiration, v => this.fromJson(v));
	}

	static getMany (transformKey = '', callback = async v => v, expiration = 24 * 60 * 60) {
		return this.transform(transformKey, callback, expiration, a => a.map(v => this.fromJson(v)));
	}

	/**
	 * @returns {ProxyTarget & this}
	 */
	static transform (transformKey, callback, expiration = 24 * 60 * 60, deserialize = v => v) {
		return new Proxy(new ProxyTarget(this, transformKey, callback, expiration, deserialize), BaseCacheModel.ProxyTargetHandler);
	}
}

class ProxyTarget {
	constructor (model, transformKey, callback, expiration, deserialize) {
		this.model = model;
		this.transformKey = transformKey;
		this.callback = callback;
		this.expiration = expiration;
		this.deserialize = deserialize;
		this.options = { asArray: 0, raw: 0, withLock: 0 };
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

	asArray () {
		this.options.asArray = 1;
		return this;
	}

	asRawArray () {
		this.options.asArray = 1;
		this.options.raw = 1;
		return this;
	}

	async parse (string) {
		if (this.options.raw) {
			return string;
		} else if (!this.options.asArray) {
			return JSON.parse(string);
		}

		return arrayStream.parse(string);
	}

	async serialize (value) {
		if (!this.options.asArray) {
			return JSON.stringify(value, null, '\t');
		}

		return arrayStream.stringify(value, { singleArrayOutput: this.options.raw });
	}

	raw () {
		this.options.raw = 1;
		return this;
	}

	withLock () {
		this.options.withLock = 1;
		return this;
	}
}

module.exports = BaseCacheModel;
module.exports.ProxyHandler = BaseModel.ProxyHandler;

module.exports.ProxyTargetHandler = _.defaults({
	get (target, property) {
		if (target[property]) {
			return target[property];
		} else if (typeof target.model[property] === 'function') {
			return async (...args) => {
				let key = `${target.model.name}:${property}:${target.options.asArray}:${target.options.raw}:${args.length ? ProxyTarget.hash(...args) : ''}:${target.transformKey}`, value;

				if (value = await redis.getCompressedAsync(key).catch(() => {})) {
					return target.deserialize(await target.parse(value));
				}

				let execAndStore = async () => {
					let value = await target.callback(await target.model[property](...args));

					if (value) {
						let serialized = await target.serialize(value);
						let expiration = target.expiration instanceof Date ? Math.floor((target.expiration - Date.now()) / 1000) : target.expiration;
						redis.setCompressedAsync(key, serialized, 'EX', expiration).catch(() => {});

						if (target.options.raw) {
							return serialized;
						}
					}

					return value;
				};

				return target.options.withLock
					? promiseLock.get(key, execAndStore, undefined, true)
					: execAndStore();
			};
		}
	},
}, BaseModel.ProxyHandler);
