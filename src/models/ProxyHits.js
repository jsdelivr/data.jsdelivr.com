const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(1).required().allow(null),
	proxyId: Joi.number().integer().min(1).required().disallow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
};

class ProxyHits extends BaseModel {
	static get table () {
		return 'proxy_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = null;

		/** @type {number} */
		this.proxyId = null;

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.hits = 0;

		/** @type {number} */
		this.bandwidth = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	toSqlFunctionCall () {
		return db.raw(`select updateOrInsertProxyHits(?, ?, ?, ?);`, [ this.proxyId, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = ProxyHits;
