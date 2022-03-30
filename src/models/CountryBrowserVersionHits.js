const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = Joi.object({
	browserVersionId: Joi.number().integer().min(0).required().allow(null),
	platformId: Joi.number().integer().min(0).required().allow(null),
	countryIso: Joi.string().length(2).required(),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class CountryBrowserVersionHits extends BaseModel {
	static get table () {
		return 'country_browser_version_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'browserVersionId', 'platformId', 'countryIso', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.browserVersionId = null;

		/** @type {number} */
		this.platformId = null;

		/** @type {string} */
		this.countryIso = null;

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
		return db.raw(`select updateOrInsertCountryBrowserVersionHits(@lastIdBrowserVersion, @lastIdPlatform, ?, ?, ?, ?);`, [ this.countryIso, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = CountryBrowserVersionHits;
