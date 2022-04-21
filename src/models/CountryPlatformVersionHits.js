const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = Joi.object({
	platformVersionId: Joi.number().integer().min(0).required().allow(null),
	countryIso: Joi.string().length(2).required(),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
	bandwidth: Joi.number().min(0).required(),
});

class CountryPlatformVersionHits extends BaseModel {
	static get table () {
		return 'country_platform_version_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'platformVersionId', 'countryIso', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.platformVersionId = null;

		/** @type {?string} */
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
		return db.raw(`select updateOrInsertCountryPlatformVersionHits(@lastIdPlatformVersion, ?, ?, ?, ?);`, [ this.countryIso, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = CountryPlatformVersionHits;
