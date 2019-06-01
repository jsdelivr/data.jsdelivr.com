const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	packageVersionId: Joi.number().integer().min(0).required().allow(null),
	filename: Joi.string().max(255).required(),
	sha256: Joi.binary().length(32).required().allow(null),
	fetchAttemptsLeft: Joi.number().integer().min(0).max(128).required(),
};

class File extends BaseModel {
	static get table () {
		return 'file';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'filename', 'packageVersionId' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = null;

		/** @type {number} */
		this.packageVersionId = null;

		/** @type {string} */
		this.filename = null;

		/** @type {Buffer} */
		this.sha256 = null;

		/** @type {number} */
		this.fetchAttemptsLeft = 3;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async getBySha256 (sha256) {
		return db(this.table)
			.where({ sha256 })
			.join(PackageVersion.table, `${this.table}.packageVersionId`, '=', `${PackageVersion.table}.id`)
			.join(Package.table, `${PackageVersion.table}.packageId`, '=', `${Package.table}.id`)
			.orderBy(`${File.table}.id`)
			.select([ 'type', 'name', 'version', 'filename as file' ])
			.first();
	}

	static async getWithPackages (criteria) {
		return db(this.table)
			.where(criteria)
			.join(PackageVersion.table, `${this.table}.packageVersionId`, '=', `${PackageVersion.table}.id`)
			.join(Package.table, `${PackageVersion.table}.packageId`, '=', `${Package.table}.id`)
			.select([ '*', `${File.table}.id as fileId` ]);
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdFile = updateOrInsertFile(@lastIdPackageVersion, ?);`, [ this.filename ]);
	}
}

module.exports = File;

const Package = require('./Package');
const PackageVersion = require('./PackageVersion');
