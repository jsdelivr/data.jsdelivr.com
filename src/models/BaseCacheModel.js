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
		this.options = { asArray: 0, raw: 0, withLock: 0, withMeta: 0 };
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

	asRawArrayWithMeta () {
		this.options.withMeta = 1;
		return this.asRawArray();
	}

	async parse (string) {
		if (this.options.raw) {
			if (!this.options.withMeta) {
				return string;
			}

			let i = string.indexOf('\n');
			let meta = JSON.parse(string.substring(0, i));
			let data = string.substring(i + 1);

			return { meta, data };
		} else if (!this.options.asArray) {
			return JSON.parse(string);
		}

		return arrayStream.parse(string);
	}

	async serialize (value) {
		if (!this.options.asArray) {
			return JSON.stringify(value, null, '\t');
		} else if (!this.options.withMeta) {
			return arrayStream.stringify(value, { singleArrayOutput: this.options.raw });
		}

		return JSON.stringify(value.meta)
			+ '\n'
			+ await arrayStream.stringify(value.data, { singleArrayOutput: this.options.raw });
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
				let key = `${target.model.name}:${property}:${target.options.asArray}:${target.options.raw}:${target.options.withMeta}:${args.length ? ProxyTarget.hash(...args) : ''}:${target.transformKey}`, value;

				if (value = await redis.getCompressedAsync(key).catch(() => {})) {
					return target.deserialize(await target.parse(value));
				}

				let execAndStore = async () => {
					let value = await target.callback(await target.model[property](...args));

					if (value) {
						let serialized = await target.serialize(value);
						let expiration = typeof target.expiration === 'function' ? target.expiration(value) : target.expiration;
						expiration = expiration instanceof Date ? Math.floor((expiration - Date.now()) / 1000) : expiration;
						redis.setCompressedAsync(key, serialized, 'EX', expiration).catch(() => {});

						if (target.options.raw) {
							return target.options.withMeta
								? { meta: value.meta, data: serialized.substring(serialized.indexOf('\n') + 1) }
								: serialized;
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
