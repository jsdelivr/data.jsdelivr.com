const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	cdn: Joi.string().required(),
	fileId: [ Joi.number().integer().min(0).required().allow(null), Joi.string().regex(/^@/) ],
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
};

class FileHitsCdn extends BaseModel {
	static get table () {
		return 'file_hits_cdn';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'cdn', 'fileId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {string} */
		this.cdn = null;

		/** @type {number} */
		this.fileId = null;

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.hits = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async deleteOlderThan (date) {
		return db(this.table).where('date', '<', date).delete();
	}
}

module.exports = FileHitsCdn;
