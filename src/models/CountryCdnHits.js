const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = Joi.object({
	countryIso: Joi.string().length(2).required(),
	cdn: Joi.string().length(2).required(),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class CountryCdnHits extends BaseModel {
	static get table () {
		return 'country_cdn_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'countryIso', 'cdn', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {string} */
		this.countryIso = null;

		/** @type {string} */
		this.cdn = null;

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
		return db.raw(`select updateOrInsertCountryCdnHits(?, ?, ?, ?, ?);`, [ this.countryIso, this.cdn, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = CountryCdnHits;
