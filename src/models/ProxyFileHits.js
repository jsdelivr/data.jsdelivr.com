const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = Joi.object({
	proxyFileId: Joi.number().integer().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class ProxyFileHits extends BaseCacheModel {
	static get table () {
		return 'proxy_file_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'proxyFileId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.proxyFileId = null;

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.hits = 0;

		/** @type {number} */
		this.bandwidth = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	toSqlFunctionCall (proxyId) {
		return db.raw(`select updateOrInsertProxyFileHits(?, @lastIdProxyFile, ?, ?, ?);`, [ proxyId, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = ProxyFileHits;
