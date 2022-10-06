const Joi = require('joi');
const BaseModel = require('./BaseModel');
const ProxyHits = require('./ProxyHits');
const TopProxy = require('./views/TopProxy');
const { toIsoDate } = require('../lib/date');
const TopProxyFile = require('./views/TopProxyFile');

const schema = Joi.object({
	id: Joi.number().integer().min(1).required().allow(null),
	name: Joi.string().max(255).required(),
	path: Joi.string().max(255).required(),
});

class ProxyModel extends BaseModel {
	static get table () {
		return 'proxy';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'name', 'path' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.id = null;

		/** @type {string} */
		this.name = '';

		/** @type {string} */
		this.path = '';

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async getPeriods () {
		return this._getPeriods(TopProxy.table);
	}

	static async getDailyStatsByName (name, from, to) {
		let sql = db(this.table)
			.where({ name })
			.join(ProxyHits.table, `${this.table}.id`, '=', `${ProxyHits.table}.proxyId`);

		if (from instanceof Date) {
			sql.where(`${ProxyHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${ProxyHits.table}.date`, '<=', to);
		}

		let data = await sql.select([ `date`, `hits`, 'bandwidth' ]);

		return {
			hits: _.fromPairs(_.map(data, record => [ toIsoDate(record.date), record.hits ])),
			bandwidth: _.fromPairs(_.map(data, record => [ toIsoDate(record.date), record.bandwidth ])),
		};
	}

	static async getStatsForPeriod (name, period, date) {
		let periodStats = await db(TopProxy.table)
			.where({ name, period, date })
			.select()
			.first() || new TopProxy({ name, period, date });

		return {
			hits: {
				total: periodStats.hits,
			},
			bandwidth: {
				total: periodStats.bandwidth,
			},
			prev: {
				hits: {
					total: periodStats.prevHits,
				},
				bandwidth: {
					total: periodStats.prevBandwidth,
				},
			},
		};
	}

	static async getTopFiles (name, by, period, date, limit = 100, page = 1) {
		let sql = db(TopProxyFile.table)
			.where({ name, period, date })
			.orderBy(by, 'desc')
			.orderBy('filename', 'desc');

		return this.paginate(sql, limit, page, [ `filename`, `hits`, `bandwidth` ], (row) => {
			return {
				name: row.filename,
				hits: { total: row.hits },
				bandwidth: { total: row.bandwidth },
			};
		});
	}
}

module.exports = ProxyModel;
