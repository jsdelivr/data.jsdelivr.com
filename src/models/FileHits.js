const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	fileId: Joi.number().integer().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class FileHits extends BaseCacheModel {
	static get table () {
		return 'file_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'fileId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.fileId = null;

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.hits = 0;

		/** @type {number} */
		this.bandwidth = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	toSqlFunctionCall () {
		return db.raw(`select updateOrInsertFileHits(@lastIdFile, ?, ?, ?);`, [ this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = FileHits;
