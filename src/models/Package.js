const Joi = require('joi');
const isSha = require('is-hexdigest');
const BaseCacheModel = require('./BaseCacheModel');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	name: Joi.string().max(255).required(),
	type: Joi.string().max(255).required(),
};

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
			.where({ type, name })
			.join(PackageVersion.table, `${this.table}.id`, '=', `${PackageVersion.table}.packageId`)
			.join(PackageVersionHits.table, `${PackageVersion.table}.id`, '=', `${PackageVersionHits.table}.packageVersionId`)
			.groupBy([ `${PackageVersion.table}.id`, `${PackageVersionHits.table}.date` ])
			.sum(`${PackageVersionHits.table}.hits as hits`);

		if (from instanceof Date) {
			sql.where(`${PackageVersionHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${PackageVersionHits.table}.date`, '<=', to);
		}

		return sql.select([ `${PackageVersion.table}.version`, `${PackageVersionHits.table}.date` ]);
	}

	static async getSumDateHitsPerVersionByName (type, name, from, to) {
		return _.mapValues(_.groupBy(await Package.getHitsByName(type, name, from, to), item => item.date.toISOString().substr(0, 10)), (versionHits) => {
			return _.mapValues(splitCommitsAndVersions(versionHits), (data) => {
				return _.fromPairs(_.map(data, entry => [ entry.version, entry.hits ]));
			});
		});
	}

	static async getSumHits (type, name, from, to) {
		let sql = db(this.table)
			.where({ type, name })
			.join(PackageHits.table, `${this.table}.id`, '=', `${PackageHits.table}.packageId`)
			.groupBy(`${Package.table}.id`)
			.sum(`${PackageHits.table}.hits as hits`);

		if (from instanceof Date) {
			sql.where(`${PackageHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${PackageHits.table}.date`, '<=', to);
		}

		return (await sql.select().first() || { hits: 0 }).hits;
	}

	static async getSumVersionHitsPerDateByName (type, name, from, to) {
		return _.mapValues(splitCommitsAndVersions(await Package.getHitsByName(type, name, from, to)), (data) => {
			return _.mapValues(_.groupBy(data, 'version'), (versionHits) => {
				return _.fromPairs(_.map(versionHits, entry => [ entry.date.toISOString().substr(0, 10), entry.hits ]));
			});
		});
	}

	static async getTopPackages (from, to, type = undefined, limit = 100, page = 1) {
		let sql = db(this.table)
			.join(PackageHits.table, `${this.table}.id`, '=', `${PackageHits.table}.packageId`)
			.groupBy(`${PackageHits.table}.packageId`)
			.sum(`${PackageHits.table}.hits as hits`)
			.orderBy('hits', 'DESC');

		if (type) {
			sql.where({ type });
		}

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		if (from instanceof Date) {
			sql.where(`${PackageHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${PackageHits.table}.date`, '<=', to);
		}

		return sql.select([ `${Package.table}.type`, `${Package.table}.name` ]);
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdPackage = updateOrInsertPackage(?, ?);`, [ this.type, this.name ]);
	}
}

function splitCommitsAndVersions (collection) {
	let [ commits, versions ] = _.partition(collection, item => isSha(item.version, 'sha1'));
	return { commits, versions };
}

module.exports = Package;

const PackageHits = require('./PackageHits');
const PackageVersion = require('./PackageVersion');
const PackageVersionHits = require('./PackageVersionHits');
