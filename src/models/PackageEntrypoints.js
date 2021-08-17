const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	type: Joi.string().max(255).required(),
	name: Joi.string().max(255).required(),
	version: Joi.string().max(255).required(),
	entrypoints: Joi.string().required(),
	updatedAt: Joi.date().required(),
});

class PackageEntrypoints extends BaseCacheModel {
	static get table () {
		return 'package_entrypoints';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'type', 'name', 'version' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {string} */
		this.type = null;

		/** @type {string} */
		this.name = null;

		/** @type {string} */
		this.version = null;

		/** @type {string} */
		this.entrypoints = null;

		/** @type {Date} */
		this.updatedAt = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}
}

module.exports = PackageEntrypoints;
