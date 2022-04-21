const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = Joi.object({
	referrerId: Joi.number().integer().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class ReferrerHits extends BaseModel {
	static get table () {
		return 'referrer_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'referrerId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.referrerId = null;

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
		return db.raw(`select updateOrInsertReferrerHits(@lastIdReferrer, ?, ?, ?);`, [ this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = ReferrerHits;
