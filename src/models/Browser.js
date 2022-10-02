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
			.orderBy('share', 'desc')
			.orderBy('name', 'desc');

		return this.paginate(sql, limit, page, [ 'name', 'share', 'prevShare' ], (row) => {
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
			.orderBy('share', 'desc')
			.orderBy('name', 'desc');

		return this.paginate(sql, limit, page, [ 'platform', 'share', 'prevShare' ], (row) => {
			return {
				name: row.platform,
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
			.orderBy('share', 'desc')
			.orderBy('countryIso', 'desc');

		return this.paginate(sql, limit, page, [ 'countryIso', 'share', 'prevShare' ], (row) => {
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
			.orderBy('share', 'desc')
			.orderBy('countryIso', 'desc');

		return this.paginate(sql, limit, page, [ 'countryIso', 'share', 'prevShare' ], (row) => {
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
			.orderBy('share', 'desc')
			.orderBy('version', 'desc');

		return this.paginate(sql, limit, page, [ 'version', 'share', 'prevShare' ], (row) => {
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
			.orderBy('share', 'desc')
			.orderBy('name', 'desc')
			.orderBy('version', 'desc');

		return this.paginate(sql, limit, page, [ 'name', 'version', 'share', 'prevShare' ], (row) => {
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
