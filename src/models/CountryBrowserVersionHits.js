const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	countryIso: Joi.string().length(2).required(),
	browserVersionId: Joi.number().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
};

class CountryBrowserVersionHits extends BaseModel {
	static get table () {
		return 'country_browser_version_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'countryIso', 'browserVersionId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {string} */
		this.countryIso = null;

		/** @type {string} */
		this.browserVersionId = null;

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
		return db.raw(`select updateOrInsertCountryBrowserVersionHits(@lastIdBrowserVersion, ?, ?, ?, ?);`, [ this.countryIso, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = CountryBrowserVersionHits;
