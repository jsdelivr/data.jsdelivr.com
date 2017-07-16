const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	packageId: Joi.number().integer().min(0).required(),
	version: Joi.string().max(255).required(),
};

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

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async findAllFileHitsByNameAndVersion (name, version, from, to) {
		let sql = db(this.table)
			.where({ name, version })
			.join(Package.table, `${this.table}.packageId`, '=', `${Package.table}.id`)
			.join(File.table, `${this.table}.id`, '=', `${File.table}.packageVersionId`)
			.join(FileHits.table, `${File.table}.id`, '=', `${FileHits.table}.fileId`);

		if (from instanceof Date) {
			sql.where(`${FileHits.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${FileHits.table}.date`, '<=', to);
		}

		return _.mapValues(_.groupBy(await Promise.map(sql.select(FileHits.columnsPrefixed.concat(`${File.table}.filename`)), async (data) => {
			return [ data.filename, await new FileHits(_.pick(data, FileHits.columns)).dbOut() ];
		}), 0), (fileHits) => {
			return _.map(fileHits, 1);
		});
	}
}

module.exports = PackageVersion;

const Package = require('./Package');
const File = require('./File');
const FileHits = require('./FileHits');
