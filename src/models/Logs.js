const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	date: Joi.date().required(),
	lines: Joi.number().integer().min(0).required(),
	megabytes: Joi.number().integer().min(0).required(),
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
		this.megabytes = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async getStats (from, to) {
		let sql = db(this.table)
			.sum(`${this.table}.lines as records`)
			.sum(`${this.table}.megabytes as megabytes`);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		return sql.select().first();
	}
}

module.exports = Logs;
