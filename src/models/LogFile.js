const Joi = require('joi');
const BaseModel = require('./BaseModel');
const relativeDayUtc = require('relative-day-utc');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	filename: Joi.string().max(255).required(),
	updatedAt: Joi.date().required(),
	processed: Joi.boolean().required(),
};

class LogFile extends BaseModel {
	static get table () {
		return 'log_file';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'filename' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = null;

		/** @type {string} */
		this.filename = null;

		/** @type {Date} */
		this.updatedAt = null;

		/** @type {boolean} */
		this.processed = false;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async cleanup () {
		return db(this.table).where('updatedAt', '<', relativeDayUtc(-7)).delete();
	}
}

module.exports = LogFile;
