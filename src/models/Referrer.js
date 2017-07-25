const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	referrer: Joi.string().max(255).required().allow(''),
};

class Referrer extends BaseModel {
	static get table () {
		return 'referrer';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'referrer' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = null;

		/** @type {string} */
		this.referrer = '';

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}
}

module.exports = Referrer;
