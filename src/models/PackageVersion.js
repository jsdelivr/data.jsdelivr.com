const Joi = require('joi');
const BaseModel = require('./BaseModel');
const { toIsoDate } = require('../lib/date');

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

		/** @type {?number} */
		this.id = null;

		/** @type {?number} */
		this.packageId = null;

		/** @type {?string} */
		this.version = null;

		/** @type {?string} */
		this.type = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async getDailyStatsByNameAndVersion (type, name, version, from, to) {
		let sql = db(this.table)
			.where(`${Package.table}.type`, type)
			.andWhere(`${Package.table}.name`, name)
			.andWhere(`${this.table}.version`, version)
			.join(Package.table, `${this.table}.packageId`, '=', `${Package.table}.id`)
			.join(PackageVersionHits.table, `${this.table}.id`, '=', `${PackageVersionHits.table}.packageVersionId`);

		if (from instanceof Date) {
			sql.where(`${PackageVersionHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${PackageVersionHits.table}.date`, '<=', to);
		}

		let data = await sql.select([ `date`, `hits`, 'bandwidth' ]);

		return {
			hits: _.fromPairs(_.map(data, record => [ toIsoDate(record.date), record.hits ])),
			bandwidth: _.fromPairs(_.map(data, record => [ toIsoDate(record.date), record.bandwidth ])),
		};
	}

	static async getStatByNameAndVersion (type, name, version, from, to, statType) {
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

		return sql.select([ `${FileHits.table}.date`, `${FileHits.table}.${statType} as stat`, `${File.table}.filename` ]);
	}

	static async getStatsByNameAndVersion (type, name, version, from, to) {
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

		return sql.select([
			`${File.table}.filename`,
			`${FileHits.table}.date`,
			`${FileHits.table}.hits as hits`,
			`${FileHits.table}.bandwidth as bandwidth`,
		]);
	}

	static async getMostUsedFiles (name, version) {
		[ , version ] = /^(0\.\d+|\d+)/.exec(version);

		return db('view_top_package_files')
			.select([ 'filename' ])
			.where({ name, version });
	}

	static async getSumDateHitsPerFileByName (type, name, version, from, to) {
		return this.getSumDateStatPerFileByName(await this.getStatByNameAndVersion(type, name, version, from, to, 'hits'));
	}

	static async getSumDateStatPerFileByName (stats) {
		return _.mapValues(_.groupBy(stats, record => toIsoDate(record.date)), (versionHits) => {
			return _.fromPairs(_.map(versionHits, record => [ record.filename, record.stat ]));
		});
	}

	static async getSumFileHitsPerDateByName (type, name, version, from, to) {
		return this.getSumFileStatPerDateByName(await this.getStatByNameAndVersion(type, name, version, from, to, 'hits'));
	}

	static async getSumFileStatPerDateByName (stats) {
		return _.mapValues(_.groupBy(stats, 'filename'), (versionHits) => {
			return _.fromPairs(_.map(versionHits, record => [ toIsoDate(record.date), record.stat ]));
		});
	}

	static async getTopFiles (type, name, version, by, from, to, limit = 100, page = 1) {
		let stats = await this.getStatsByNameAndVersion(type, name, version, from, to);

		let sorted = _.map(_.groupBy(stats, 'filename'), (fileStats) => {
			return {
				name: fileStats[0].filename,
				hits: _.sumBy(fileStats, 'hits'),
				bandwidth: _.sumBy(fileStats, 'bandwidth'),
				records: fileStats,
			};
		}).sort((a, b) => b[by] - a[by]);

		return this.paginateArray(sorted, limit, page, (fileStats) => {
			return {
				name: fileStats.name,
				hits: {
					total: fileStats.hits,
					dates: _.fromPairs(_.map(fileStats.records, record => [ toIsoDate(record.date), record.hits ])),
				},
				bandwidth: {
					total: fileStats.bandwidth,
					dates: _.fromPairs(_.map(fileStats.records, record => [ toIsoDate(record.date), record.bandwidth ])),
				},
			};
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
const PackageVersionHits = require('./PackageVersionHits');
