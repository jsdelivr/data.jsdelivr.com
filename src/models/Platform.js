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

	static async getTopPlatformBrowsers (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformBrowser.table)
			.where({ name, period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'browser' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'browser', 'share', 'prevShare' ])).map((row) => {
			return {
				browser: row.browser,
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

	static async getTopPlatformVersionCountries (name, version, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformVersionCountry.table)
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

	static async getTopPlatformVersions (name, period, date, composedLocationFilter, limit = 100, page = 1) {
		let sql = db(TopPlatformVersion.table)
			.where({ name, period, date })
			.where(composedLocationFilter)
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'version' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'version', 'versionName', 'share', 'prevShare' ])).map((row) => {
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
			.orderBy([{ column: 'share', order: 'desc' }, { column: 'name' }, { column: 'version' }]);

		if (limit) {
			sql.limit(limit).offset((page - 1) * limit);
		}

		return (await sql.select([ 'name', 'version', 'versionName', 'share', 'prevShare' ])).map((row) => {
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
