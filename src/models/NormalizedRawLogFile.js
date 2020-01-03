const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(0).required().allow(null),
	filename: Joi.string().max(255).required(),
	fileModificationTime: Joi.number().integer().min(0).required(),
	updatedAt: Joi.date().required(),
	processed: Joi.number().required(),
	date: Joi.date().required(),
};

class NormalizedRawLogFile extends BaseModel {
	static get table () {
		return 'normalized_raw_log_file';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'filename', 'fileModificationTime' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = null;

		/** @type {string} */
		this.filename = null;

		/** @type {number} */
		this.fileModificationTime = null;

		/** @type {Date} */
		this.updatedAt = null;

		/** @type {number} */
		this.processed = 0;

		/** @type {Date} */
		this.date = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	toSqlFunctionCall () {
		return db.raw(`select updateNormalizedRawLogFile(?, ?, ?);`, [ this.filename, this.fileModificationTime, this.updatedAt ]);
	}
}

module.exports = NormalizedRawLogFile;
