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

	static async getHitsByName (type, name, from, to) {
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

		return sql.select([ `${PackageVersion.table}.version`, `${PackageVersion.table}.type`, `${PackageVersionHits.table}.date`, `${PackageVersionHits.table}.hits` ]);
	}

	static async getSumDateHitsPerVersionByName (type, name, from, to) {
		return _.mapValues(_.groupBy(await Package.getHitsByName(type, name, from, to), item => item.date.toISOString().substr(0, 10)), (versionHits) => {
			return _.mapValues(splitCommitsAndVersions(versionHits), (data) => {
				return _.fromPairs(_.map(data, entry => [ entry.version, entry.hits ]));
			});
		});
	}

	static async getStatsForPeriod (type, name, period, date) {
		let sql = db(`view_top_packages_${period}`)
			.where({ type, name, date });

		return sql.select().first();
	}

	static async getSumVersionHitsPerDateByName (type, name, from, to) {
		return _.mapValues(splitCommitsAndVersions(await Package.getHitsByName(type, name, from, to)), (data) => {
			return _.mapValues(_.groupBy(data, 'version'), (versionHits) => {
				return _.fromPairs(_.map(versionHits, entry => [ entry.date.toISOString().substr(0, 10), entry.hits ]));
			});
		});
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

		return sql.select([ `type`, `name`, `hits` ]);
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
