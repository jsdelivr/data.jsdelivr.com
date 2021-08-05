const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
	packageId: Joi.number().integer().min(0).required().allow(null),
	version: Joi.string().max(255).required(),
	type: Joi.string().max(16).required(),
});

class PackageVersion extends BaseModel {
	static get table () {
		return 'package_version';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'packageId', 'version' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = null;

		/** @type {number} */
		this.packageId = null;

		/** @type {string} */
		this.version = null;

		/** @type {string} */
		this.type = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async getHitsByNameAndVersion (type, name, version, from, to) {
		let sql = db(this.table)
			.where(`${Package.table}.type`, type)
			.andWhere(`${Package.table}.name`, name)
			.andWhere(`${this.table}.version`, version)
			.join(Package.table, `${this.table}.packageId`, '=', `${Package.table}.id`)
			.join(File.table, `${this.table}.id`, '=', `${File.table}.packageVersionId`)
			.join(FileHits.table, `${File.table}.id`, '=', `${FileHits.table}.fileId`);

		if (from instanceof Date) {
			sql.where(`${FileHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${FileHits.table}.date`, '<=', to);
		}

		return sql.select([ `${FileHits.table}.*`, `${File.table}.filename` ]);
	}

	static async getMostUsedFiles (name, version) {
		return db('view_top_package_files')
			.select([ 'filename' ])
			.where({ name, version });
	}

	static async getSumDateHitsPerFileByName (type, name, version, from, to) {
		return _.mapValues(_.groupBy(await PackageVersion.getHitsByNameAndVersion(type, name, version, from, to), item => item.date.toISOString().substr(0, 10)), (versionHits) => {
			return _.fromPairs(_.map(versionHits, entry => [ entry.filename, entry.hits ]));
		});
	}

	static async getSumFileHitsPerDateByName (type, name, version, from, to) {
		return _.mapValues(_.groupBy(await PackageVersion.getHitsByNameAndVersion(type, name, version, from, to), 'filename'), (versionHits) => {
			return _.fromPairs(_.map(versionHits, entry => [ entry.date.toISOString().substr(0, 10), entry.hits ]));
		});
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdPackageVersion = updateOrInsertPackageVersion(@lastIdPackage, ?, ?);`, [ this.version, this.type ]);
	}
}

module.exports = PackageVersion;

const Package = require('./Package');
const File = require('./File');
const FileHits = require('./FileHits');
