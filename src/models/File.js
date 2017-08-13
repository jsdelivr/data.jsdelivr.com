const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	packageVersionId: [ Joi.number().integer().min(0).required(), Joi.string().regex(/^@/) ],
	filename: Joi.string().max(255).required(),
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

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}
}

module.exports = File;
