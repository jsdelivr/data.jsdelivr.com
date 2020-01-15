const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = {
	packageVersionId: Joi.number().integer().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
};

class PackageVersionHits extends BaseCacheModel {
	static get table () {
		return 'package_version_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'packageVersionId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.packageVersionId = null;

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.hits = 0;

		/** @type {number} */
		this.bandwidth = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}
}

module.exports = PackageVersionHits;
