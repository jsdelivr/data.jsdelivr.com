const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');
const { toIsoDate } = require('../lib/date');

const schema = Joi.object({
	packageId: Joi.number().integer().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class PackageHits extends BaseCacheModel {
	static get table () {
		return 'package_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'packageId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.packageId = null;

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
		let sql = db('view_network_packages');

		if (from instanceof Date) {
			sql.where(`date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`date`, '<=', to);
		}

		let data = await sql.select([ `date`, `hits`, `bandwidth` ]);

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
		return db.raw(`select updateOrInsertPackageHits(@lastIdPackage, ?, ?, ?);`, [ this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = PackageHits;
