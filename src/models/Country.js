const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	iso: Joi.string().length(2).required(),
});

class Country extends BaseCacheModel {
	static get table () {
		return 'country';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'iso' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?string} */
		this.iso = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}
}

module.exports = Country;
