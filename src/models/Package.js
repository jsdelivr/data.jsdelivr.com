const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
	name: Joi.string().max(255).required(),
	type: Joi.string().max(255).required(),
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

		/** @type {number} */
		this.id = null;

		/** @type {string} */
		this.name = null;

		/** @type {string} */
		this.type = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	static async getSumDateBandwidthPerVersionByName (type, name, from, to) {
		return this.getSumDateStatPerVersionByName(await this.getStatByName(type, name, from, to, 'bandwidth'));
	}

	static async getSumDateHitsPerVersionByName (type, name, from, to) {
		return this.getSumDateStatPerVersionByName(await this.getStatByName(type, name, from, to, 'hits'));
	}

	static getSumDateStatPerVersionByName (stats) {
		return _.mapValues(_.groupBy(stats, item => item.date.toISOString().substr(0, 10)), (versionStats) => {
			return _.mapValues(splitCommitsAndVersions(versionStats), (data) => {
				return _.fromPairs(_.map(data, entry => [ entry.version, entry.stat ]));
			});
		});
	}

	static async getStatsForPeriod (type, name, period, date) {
		let sql = db(`view_top_packages_${period}`)
			.where({ type, name, date });

		return sql.select().first();
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
				return _.fromPairs(_.map(versionStats, entry => [ entry.date.toISOString().substr(0, 10), entry.stat ]));
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
		let sql = db(`view_top_packages_${period}`)
			.where({ date })
			.orderBy('hits', 'DESC');

		if (type) {
			sql.where({ type });
		}

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return sql.select([ `type`, `name`, `hits`, `bandwidth` ]);
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

const PackageVersion = require('./PackageVersion');
const PackageVersionHits = require('./PackageVersionHits');
