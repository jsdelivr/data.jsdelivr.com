const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	iso: Joi.string().length(2).required(),
});

class Continent extends BaseCacheModel {
	static get table () {
		return 'continent';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'code' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?string} */
		this.code = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}
}

module.exports = Continent;
