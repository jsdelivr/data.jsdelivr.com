const Joi = require('joi');
const BaseModel = require('./BaseModel');
const ProxyHits = require('./ProxyHits');
const TopProxy = require('./views/TopProxy');
const { toIsoDate } = require('../lib/date');
const ProxyFile = require('./ProxyFile');
const ProxyFileHits = require('./ProxyFileHits');

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

	static async getTopFiles (name, by, from, to, limit = 100, page = 1) {
		let sql = db(this.table)
			.sum(`${ProxyFileHits.table}.hits as hits`)
			.sum(`${ProxyFileHits.table}.bandwidth as bandwidth`)
			.where(`${this.table}.name`, name)
			.join(ProxyFile.table, `${this.table}.id`, '=', `${ProxyFile.table}.proxyId`)
			.join(ProxyFileHits.table, `${ProxyFile.table}.id`, '=', `${ProxyFileHits.table}.proxyFileId`)
			.groupBy([ `${this.table}.id`, `${ProxyFile.table}.filename` ])
			.orderBy(by, 'desc')
			.orderBy('filename', 'desc');

		if (from instanceof Date) {
			sql.where(`${ProxyFileHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${ProxyFileHits.table}.date`, '<=', to);
		}

		return this.paginate(sql, limit, page, [ `${ProxyFile.table}.filename as name` ], (row) => {
			return {
				name: row.name,
				hits: { total: row.hits },
				bandwidth: { total: row.bandwidth },
			};
		});
	}
}

module.exports = ProxyModel;
