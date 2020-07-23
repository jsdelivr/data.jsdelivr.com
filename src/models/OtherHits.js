const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class OtherHits extends BaseCacheModel {
	static get table () {
		return 'other_hits';
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
		this.hits = 0;

		/** @type {number} */
		this.bandwidth = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	static async getSumPerDate (from, to) {
		let sql = db(this.table);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		return _.fromPairs(_.map(await sql.select([ `${this.table}.date`, `${this.table}.hits` ]), (record) => {
			return [ record.date.toISOString().substr(0, 10), record.hits ];
		}));
	}

	toSqlFunctionCall () {
		return db.raw(`select updateOrInsertOtherHits(?, ?, ?);`, [ this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = OtherHits;
