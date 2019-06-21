const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = {
	type: Joi.string().max(255).required(),
	name: Joi.string().max(255).required(),
	version: Joi.string().max(255).required(),
	listing: Joi.string().required(),
};

class PackageListing extends BaseCacheModel {
	static get table () {
		return 'package_listing';
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
		this.listing = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}
}

module.exports = PackageListing;
