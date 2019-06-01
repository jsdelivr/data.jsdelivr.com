const Joi = require('joi');
const BaseCacheModel = require('./BaseCacheModel');

const schema = {
	fileId: Joi.number().integer().min(0).required().allow(null),
	date: Joi.date().required(),
	hits: Joi.number().integer().min(0).required(),
};

class FileHits extends BaseCacheModel {
	static get table () {
		return 'file_hits';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'fileId', 'date' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.fileId = null;

		/** @type {Date} */
		this.date = null;

		/** @type {number} */
		this.hits = 0;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}

	static async getSumByDate (from, to) {
		let sql = db(this.table)
			.groupBy(`${this.table}.date`)
			.sum(`${this.table}.hits as hits`);

		if (from instanceof Date) {
			sql.where(`${this.table}.date`, '>=', from);
		}

		if (to instanceof Date) {
			sql.where(`${this.table}.date`, '<=', to);
		}

		return _.fromPairs(_.map(await sql.select([ `${this.table}.date` ]), (record) => {
			return [ record.date.toISOString().substr(0, 10), record.hits ];
		}));
	}

	toSqlFunctionCall () {
		return db.raw(`select updateOrInsertFileHits(@lastIdFile, ?, ?);`, [ this.date, this.hits ]);
	}
}

module.exports = FileHits;
