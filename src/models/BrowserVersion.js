const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
	browserId: Joi.number().integer().min(0).required().allow(null),
	version: Joi.string().max(255).required().allow(''),
});

class BrowserVersion extends BaseModel {
	static get table () {
		return 'browser_version';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'browserId', 'version' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.id = null;

		/** @type {?number} */
		this.browserId = null;

		/** @type {?string} */
		this.version = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdBrowserVersion = updateOrInsertBrowserVersion(@lastIdBrowser, ?);`, [ this.version ]);
	}
}

module.exports = BrowserVersion;
