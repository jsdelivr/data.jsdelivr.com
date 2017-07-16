const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	fileId: Joi.number().integer().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
};

class FileHits extends BaseModel {
	static get table () {
		return 'file_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'fileId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.fileId = null;

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.hits = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	async add (number) {
		this.hits = await db(this.constructor.table).where(this.unique).increment('hits', number);
		return this;
	}
}

module.exports = FileHits;
