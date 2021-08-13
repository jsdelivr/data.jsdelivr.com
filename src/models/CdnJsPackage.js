const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = Joi.object({
	name: Joi.string().max(255).required(),
	version: Joi.string().max(255).required(),
	filename: Joi.string().max(255).required(),
});

class CdnJsPackage extends BaseModel {
	static get table () {
		return 'cdnjs_package';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'name', 'version' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {string} */
		this.name = null;

		/** @type {string} */
		this.version = null;

		/** @type {string} */
		this.filename = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async getPackageEntrypoints (name, version) {
		return db(this.table)
			.select(`${this.table}.filename`)
			.where(`${this.table}.name`, name)
			.andWhere(`${this.table}.version`, version);
	}
}

module.exports = CdnJsPackage;
