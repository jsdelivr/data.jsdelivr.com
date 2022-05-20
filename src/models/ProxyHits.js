const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');
const { toIsoDate } = require('../lib/date');

const schema = Joi.object({
	proxyId: Joi.number().integer().min(1).required(),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class ProxyHits extends BaseCacheModel {
	static get table () {
		return 'proxy_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'proxyId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.proxyId = null;

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

		let data = await sql
			.sum(`${this.table}.hits as hits`)
			.groupBy(`${this.table}.date`)
			.select([ `${this.table}.date`, `${this.table}.bandwidth` ]);

		return {
			hits: _.fromPairs(_.map(data, (record) => {
				return [ toIsoDate(record.date), record.hits ];
			})),
			bandwidth: _.fromPairs(_.map(data, (record) => {
				return [ toIsoDate(record.date), record.bandwidth ];
			})),
		};
	}

	toSqlFunctionCall () {
		return db.raw(`select updateOrInsertProxyHits(?, ?, ?, ?);`, [ this.proxyId, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = ProxyHits;
