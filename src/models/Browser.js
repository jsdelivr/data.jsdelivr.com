const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');
const TopBrowser = require('./views/TopBrowser');
const TopBrowserPlatform = require('./views/TopBrowserPlatform');
const TopBrowserCountry = require('./views/TopBrowserCountry');
const TopBrowserVersionCountry = require('./views/TopBrowserVersionCountry');
const TopBrowserVersion = require('./views/TopBrowserVersion');

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
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
		return [ 'id', 'name' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.id = null;

		/** @type {?string} */
		this.name = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	static async getPeriods () {
		return this._getPeriods(TopBrowser.table);
	}

	static async getTopBrowsers (period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopBrowser.table)
			.where({ period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'name' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'name', 'share', 'prevShare' ])).map((row) => {
			return {
				name: row.name,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	static async getTopBrowserPlatforms (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopBrowserPlatform.table)
			.where({ name, period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'name' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'platform', 'share', 'prevShare' ])).map((row) => {
			return {
				platform: row.platform,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	static async getTopBrowserCountries (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopBrowserCountry.table)
			.where({ name, period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'countryIso' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'countryIso', 'share', 'prevShare' ])).map((row) => {
			return {
				country: row.countryIso,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	static async getTopBrowserVersionCountries (name, version, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopBrowserVersionCountry.table)
			.where({ name, version, period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'countryIso' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'countryIso', 'share', 'prevShare' ])).map((row) => {
			return {
				country: row.countryIso,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	static async getTopBrowserVersions (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopBrowserVersion.table)
			.where({ name, period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'version' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'version', 'share', 'prevShare' ])).map((row) => {
			return {
				version: row.version,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	static async getTopBrowsersVersions (period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopBrowserVersion.table)
			.where({ period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'name' }, { column: 'version' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'name', 'version', 'share', 'prevShare' ])).map((row) => {
			return {
				name: row.name,
				version: row.version,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdBrowser = updateOrInsertBrowser(?);`, [ this.name ]);
	}
}

module.exports = Browser;
