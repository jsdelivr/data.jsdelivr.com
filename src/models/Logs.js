const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	date: Joi.date().required(),
	lines: Joi.number().integer().min(0).required(),
	bytes: Joi.number().integer().min(0).required(),
};

class Logs extends BaseModel {
	static get table () {
		return 'logs';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.lines = 0;

		/** @type {number} */
		this.bytes = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}
}

module.exports = Logs;
