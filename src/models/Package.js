const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');
const { toIsoDate } = require('../lib/date');

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
	name: Joi.string().max(255).required(),
	type: Joi.string().max(255).required(),
	isPrivate: Joi.number().integer().min(0).max(1).required(),
});

class Package extends BaseCacheModel {
	static get table () {
		return 'package';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'name', 'type' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.id = null;

		/** @type {?string} */
		this.name = null;

		/** @type {?string} */
		this.type = null;

		/** @type {number} */
		this.isPrivate = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	static async getDailyStatsByName (type, name, from, to) {
		let sql = db(this.table)
			.where({ type, name })
			.join(PackageHits.table, `${this.table}.id`, '=', `${PackageHits.table}.packageId`);

		if (from instanceof Date) {
			sql.where(`${PackageHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${PackageHits.table}.date`, '<=', to);
		}

		let data = await sql.select([ `date`, `hits`, 'bandwidth' ]);

		return {
			hits: _.fromPairs(_.map(data, record => [ toIsoDate(record.date), record.hits ])),
			bandwidth: _.fromPairs(_.map(data, record => [ toIsoDate(record.date), record.bandwidth ])),
		};
	}

	static async getSumDateBandwidthPerVersionByName (type, name, from, to) {
		return this.getSumDateStatPerVersionByName(await this.getStatByName(type, name, from, to, 'bandwidth'));
	}

	static async getSumDateHitsPerVersionByName (type, name, from, to) {
		return this.getSumDateStatPerVersionByName(await this.getStatByName(type, name, from, to, 'hits'));
	}

	static getSumDateStatPerVersionByName (stats) {
		return _.mapValues(_.groupBy(stats, record => toIsoDate(record.date)), (versionStats) => {
			return _.mapValues(splitCommitsAndVersions(versionStats), (data) => {
				return _.fromPairs(_.map(data, record => [ record.version, record.stat ]));
			});
		});
	}

	static async getStatsForPeriod (type, name, period, date) {
		let periodStats = await db(TopPackage.table)
			.where({ type, name, period, date })
			.select()
			.first() || new TopPackage({ type, name, period, date });

		return {
			hits: {
				rank: periodStats.hitsRank,
				typeRank: periodStats.hitsTypeRank,
				total: periodStats.hits,
			},
			bandwidth: {
				rank: periodStats.bandwidthRank,
				typeRank: periodStats.bandwidthTypeRank,
				total: periodStats.bandwidth,
			},
			prev: {
				hits: {
					rank: periodStats.prevHitsRank,
					typeRank: periodStats.prevHitsTypeRank,
					total: periodStats.prevHits,
				},
				bandwidth: {
					rank: periodStats.prevBandwidthRank,
					typeRank: periodStats.prevBandwidthTypeRank,
					total: periodStats.prevBandwidth,
				},
			},
		};
	}

	static async getSumVersionBandwidthPerDateByName (type, name, from, to) {
		return this.getSumVersionStatPerDateByName(await this.getStatByName(type, name, from, to, 'bandwidth'));
	}

	static async getSumVersionHitsPerDateByName (type, name, from, to) {
		return this.getSumVersionStatPerDateByName(await this.getStatByName(type, name, from, to, 'hits'));
	}

	static getSumVersionStatPerDateByName (stats) {
		return _.mapValues(splitCommitsAndVersions(stats), (data) => {
			return _.mapValues(_.groupBy(data, 'version'), (versionStats) => {
				return _.fromPairs(_.map(versionStats, record => [ toIsoDate(record.date), record.stat ]));
			});
		});
	}

	static async getStatByName (type, name, from, to, statType) {
		let sql = db(this.table)
			.where(`${this.table}.type`, type)
			.andWhere(`${this.table}.name`, name)
			.join(PackageVersion.table, `${this.table}.id`, '=', `${PackageVersion.table}.packageId`)
			.join(PackageVersionHits.table, `${PackageVersion.table}.id`, '=', `${PackageVersionHits.table}.packageVersionId`);

		if (from instanceof Date) {
			sql.where(`${PackageVersionHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${PackageVersionHits.table}.date`, '<=', to);
		}

		return sql.select([ `${PackageVersion.table}.version`, `${PackageVersion.table}.type`, `${PackageVersionHits.table}.date`, `${PackageVersionHits.table}.${statType} as stat` ]);
	}

	static async getTopPackages (period, date, type = undefined, limit = 100, page = 1) {
		let sql = db(TopPackage.table)
			.where({ period, date })
			.orderBy('hits', 'DESC');

		if (type) {
			sql.where({ type });
		}

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return _.map(await sql.select([ `type`, `name`, `hits`, `bandwidth`, `prevHits`, `prevBandwidth` ]), ({ type, name, hits, bandwidth, ...prev }) => {
			return {
				type, name, hits, bandwidth,
				prev: { hits: prev.prevHits, bandwidth: prev.prevBandwidth },
			};
		});
	}

	static async getTopVersions (type, name, by, from, to, limit = 100, page = 1) {
		let stats = await this.getStatByName(type, name, from, to, by);
		let start = (page - 1) * limit;

		return _.map(_.groupBy(stats, record => `${record.type}:${record.version}`), (versionStats) => {
			return {
				type: versionStats[0].type,
				version: versionStats[0].version,
				total: _.sumBy(versionStats, 'stat'),
				dates: _.fromPairs(_.map(versionStats, record => [ toIsoDate(record.date), record.stat ])),
			};
		}).sort((a, b) => b.total - a.total).slice(start, start + limit);
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdPackage = updateOrInsertPackage(?, ?);`, [ this.type, this.name ]);
	}
}

function splitCommitsAndVersions (collection) {
	let { commit: commits, version: versions, branch: branches } = _.groupBy(collection, item => item.type);
	return { commits, versions, branches };
}

module.exports = Package;

const PackageHits = require('./PackageHits');
const PackageVersion = require('./PackageVersion');
const PackageVersionHits = require('./PackageVersionHits');
const TopPackage = require('./views/TopPackage');
