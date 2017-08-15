const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	filename: Joi.string().max(255).required(),
	updatedAt: Joi.date().required(),
	processed: Joi.number().required(),
	date: Joi.date().required(),
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

		/** @type {number} */
		this.processed = 0;

		/** @type {Date} */
		this.date = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async deleteOlderThan (date) {
		return db(this.table).where('updatedAt', '<', date).delete();
	}

	static async findOlderThan (date) {
		return Promise.map(db(this.table).where('updatedAt', '<', date).select(), data => new this(data).dbOut());
	}
}

module.exports = LogFile;
