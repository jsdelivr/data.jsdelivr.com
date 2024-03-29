const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');
const { toIsoDate } = require('../lib/date');

const schema = Joi.object({
	date: Joi.date().required(),
	records: Joi.number().integer().min(0).required(),
	megabytesLogs: Joi.number().integer().min(0).required(),
	megabytesTraffic: Joi.number().integer().min(0).required(),
});

class Logs extends BaseCacheModel {
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
		this.records = 0;

		/** @type {number} */
		this.megabytesLogs = 0;

		/** @type {number} */
		this.megabytesTraffic = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	static async getMegabytesPerDate (from, to) {
		let sql = db(this.table);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		return _.fromPairs(_.map(await sql.select([ `${this.table}.date`, `${this.table}.megabytesTraffic` ]), (record) => {
			return [ toIsoDate(record.date), record.megabytesTraffic ];
		}));
	}

	static async getMetaStats (from, to) {
		let sql = db(this.table)
			.sum(`${this.table}.records as records`);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		return sql.select([
			db.raw(`sum(${this.table}.megabytesLogs * 1024 * 1024) as recordsBytes`),
		]).first();
	}

	toSqlFunctionCall () {
		return db.raw(`select updateOrInsertLogs(?, ?, ?, ?);`, [ this.date, this.records, this.megabytesLogs, this.megabytesTraffic ]);
	}
}

module.exports = Logs;
