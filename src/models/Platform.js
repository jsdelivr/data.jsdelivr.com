const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');
const TopPlatform = require('./views/TopPlatform');
const TopPlatformBrowser = require('./views/TopPlatformBrowser');
const TopPlatformCountry = require('./views/TopPlatformCountry');
const TopPlatformVersionCountry = require('./views/TopPlatformVersionCountry');
const TopPlatformVersion = require('./views/TopPlatformVersion');

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
	name: Joi.string().max(255).required(),
});

class Platform extends BaseCacheModel {
	static get table () {
		return 'platform';
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
		return this._getPeriods(TopPlatform.table);
	}

	static async getTopPlatforms (period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatform.table)
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

	static async getTopPlatformBrowsers (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformBrowser.table)
			.where({ name, period, date })
			.where(composedLocationFilter)
			.orderBy('share', 'desc')
			.orderBy('browser', 'desc');

		return this.paginate(sql, limit, page, [ 'browser', 'share', 'prevShare' ], (row) => {
			return {
				name: row.browser,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	static async getTopPlatformCountries (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformCountry.table)
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

	static async getTopPlatformVersionCountries (name, version, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformVersionCountry.table)
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

	static async getTopPlatformVersions (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformVersion.table)
			.where({ name, period, date })
			.where(composedLocationFilter)
			.orderBy('share', 'desc')
			.orderBy('version', 'desc');

		return this.paginate(sql, limit, page, [ 'version', 'versionName', 'share', 'prevShare' ], (row) => {
			return {
				version: row.version,
				versionName: row.versionName,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	static async getTopPlatformsVersions (period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformVersion.table)
			.where({ period, date })
			.where(composedLocationFilter)
			.orderBy('share', 'desc')
			.orderBy('name', 'desc')
			.orderBy('version', 'desc');

		return this.paginate(sql, limit, page, [ 'name', 'version', 'versionName', 'share', 'prevShare' ], (row) => {
			return {
				name: row.name,
				version: row.version,
				versionName: row.versionName,
				share: row.share,
				prev: {
					share: row.prevShare,
				},
			};
		});
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdPlatform = updateOrInsertPlatform(?);`, [ this.name ]);
	}
}

module.exports = Platform;
