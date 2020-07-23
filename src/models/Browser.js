const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
	platformId: Joi.number().integer().min(0).required().allow(null),
	name: Joi.string().max(255).required(),
});

class Browser extends BaseCacheModel {
	static get table () {
		return 'browser';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'platformId', 'name' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = null;

		/** @type {number} */
		this.platformId = null;

		/** @type {string} */
		this.name = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdBrowser = updateOrInsertBrowser(@lastIdPlatform, ?);`, [ this.name ]);
	}
}

module.exports = Browser;
