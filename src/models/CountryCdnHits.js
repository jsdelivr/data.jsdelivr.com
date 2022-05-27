const Joi = require('joi');
const BaseModel = require('./BaseModel');
const Country = require('./Country');
const NetworkCdn = require('./views/NetworkCdn');
const NetworkCountry = require('./views/NetworkCountry');
const { toIsoDate } = require('../lib/date');

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

		/** @type {?string} */
		this.countryIso = null;

		/** @type {?string} */
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

	static async getProviderCountryStats (type, from, to) {
		let sql = db(this.table);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		let stats = await sql
			.sum(`${this.table}.${type} as stat`)
			.groupBy([ `${this.table}.cdn`, `${this.table}.countryIso` ])
			.select([ `${this.table}.cdn`, `${this.table}.countryIso` ]);

		return _.mapValues(_.groupBy(stats, 'countryIso'), (countryStats) => {
			return _.fromPairs(_.map(countryStats, record => [ record.cdn, record.stat ]));
		});
	}

	static async getDailyProvidersStatsForLocation (type, locationFilter, from, to) {
		let sql = db(this.table)
			.join(Country.table, `${this.table}.countryIso`, '=', `${Country.table}.iso`)
			.where(locationFilter);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		let stats = await sql
			.sum(`${this.table}.${type} as stat`)
			.groupBy([ `${this.table}.cdn`, `${this.table}.date` ])
			.select([ `${this.table}.cdn`, `${this.table}.date` ]);

		return _.mapValues(_.groupBy(stats, 'cdn'), (cdnStats) => {
			return _.fromPairs(_.map(cdnStats, record => [ toIsoDate(record.date), record.stat ]));
		});
	}

	static async getCountryStatsForPeriod (period, date) {
		let periodStats = await db(NetworkCountry.table)
			.where({ period, date })
			.select();

		return _.fromPairs(periodStats.map((country) => {
			return [
				country.countryIso,
				{
					hits: {
						total: country.hits,
					},
					bandwidth: {
						total: country.bandwidth,
					},
					prev: {
						hits: {
							total: country.prevHits,
						},
						bandwidth: {
							total: country.prevBandwidth,
						},
					},
				},
			];
		}));
	}

	static async getProvidersStatsForPeriodAndLocation (period, locationString, date) {
		let periodStats = await db(NetworkCdn.table)
			.where({ location: locationString, period, date })
			.select();

		return _.fromPairs(periodStats.map((provider) => {
			return [
				provider.cdn,
				{
					hits: {
						total: provider.hits,
					},
					bandwidth: {
						total: provider.bandwidth,
					},
					prev: {
						hits: {
							total: provider.prevHits,
						},
						bandwidth: {
							total: provider.prevBandwidth,
						},
					},
				},
			];
		}));
	}

	toSqlFunctionCall () {
		return db.raw(`select updateOrInsertCountryCdnHits(?, ?, ?, ?, ?);`, [ this.countryIso, this.cdn, this.date, this.hits, this.bandwidth ]);
	}
}

module.exports = CountryCdnHits;
