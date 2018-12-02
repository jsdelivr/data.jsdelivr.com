const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = {
	date: Joi.date().required(),
	records: Joi.number().integer().min(0).required(),
	megabytesLogs: Joi.number().integer().min(0).required(),
	megabytesTraffic: Joi.number().integer().min(0).required(),
};

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

	static async getMegabytesByDate (from, to) {
		let sql = db(this.table)
			.groupBy(`${this.table}.date`)
			.sum(`${this.table}.megabytesTraffic as megabytesTraffic`);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		return _.fromPairs(_.map(await sql.select([ `${this.table}.date` ]), (record) => {
			return [ record.date.toISOString().substr(0, 10), record.megabytesTraffic ];
		}));
	}

	static async getMetaStats (from, to) {
		let sql = db(this.table)
			.sum(`${this.table}.records as records`)
			.sum(`${this.table}.megabytesLogs as megabytes`);

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
