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

	static async getTotal (from, to) {
		let sql = db(this.table)
			.sum(`${this.table}.hits as hits`)

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		return sql.select().first();
	}
}

module.exports = FileHits;
