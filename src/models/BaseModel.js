const Joi = require('joi');
const dateRange = require('../routes/utils/dateRange');
const getProperties = _.memoize(schema => Object.keys(schema.describe().keys));

class BaseModel {
	static get table () {}
	static get schema () {}
	static get unique () {}

	static get columns () {
		return Object.keys(this.schema);
	}

	static get columnsPrefixed () {
		return this.columns.map(column => `${this.table}.${column}`);
	}

	get properties () {
		return getProperties(this.constructor.schema);
	}

	get unique () {
		return _.pickBy(_.pick(this, this.constructor.unique));
	}

	/**
	 * Gets the first object matching the criteria.
	 *
	 * @param {Object|Function|number} criteria
	 * @returns {Promise<*>}
	 */
	static async find (criteria) {
		let where;

		if (_.isObject(criteria) || typeof criteria === 'function') {
			where = criteria;
		} else if (typeof criteria === 'number') {
			where = { id: criteria };
		} else {
			return null;
		}

		return db(this.table).where(where).first().then((data) => {
			return data ? new this(data).dbOut() : null;
		});
	}

	/**
	 * Gets all objects matching the criteria.
	 *
	 * @param {Object|Function} [criteria]
	 * @param {number} [limit]
	 * @param {number} [offset]
	 * @returns {Promise<*>}
	 */
	static async findAll (criteria = {}, limit, offset) {
		let sql = db(this.table).where(criteria);

		if (typeof limit === 'number') {
			sql.limit(limit);
		}

		if (typeof offset === 'number') {
			sql.offset(offset);
		}

		return Bluebird.map(sql.select(), data => new this(data).dbOut(), { concurrency: 8 });
	}

	static async _getPeriods (table) {
		let sql = db(table)
			.whereIn('period', [ 's-day', 's-week', 's-month', 's-quarter', 's-year' ])
			.orderBy('period', 'desc')
			.orderBy('date', 'desc');

		return (await sql.distinct([ 'period', 'date' ])).map((row) => {
			return {
				period: dateRange.periodToString(row.period, row.date),
				periodType: row.period,
			};
		});
	}

	dbIn () {
		return _.pick(this, this.properties);
	}

	async dbOut () {
		return this;
	}

	/**
	 * @returns {Promise<number>}
	 */
	async delete () {
		return db(this.constructor.table).where(this.unique).delete();
	}

	/**
	 * @returns {Promise<this>}
	 */
	async insert () {
		if ('updatedAt' in this) {
			this.updatedAt = new Date();
		}

		await this.validate();

		return db(this.constructor.table).insert(this.dbIn()).then(([ id ]) => {
			this.id = id;
			return this;
		});
	}

	async insertOrLoad () {
		try {
			await this.insert();
		} catch (e) {
			if (e.sqlState !== '23000') {
				throw e;
			}

			let found = await this.constructor.find(this.unique);

			if (!found) {
				throw new Error(`Error 23000 thrown but then not found: ${e.message}`);
			}

			Object.assign(this, found);
			return false;
		}

		return true;
	}

	async isValid () {
		try {
			await this.validate();
		} catch (e) {
			return false;
		}

		return true;
	}

	static async paginate (sql, limit, page, select, mapper) {
		let countPromise;

		if (limit) {
			countPromise = sql.clone().clear('order').select(db.raw('count(*) over () as count')).first();
			sql.limit(limit).offset((page - 1) * limit);
		}

		let [ { count = 0 } = {}, records ] = await Promise.all([
			countPromise,
			sql.select(select),
		]);

		if (mapper) {
			records = records.map(mapper);
		}

		return {
			page,
			limit,
			pages: limit ? Math.ceil(count / limit) : 1,
			records,
		};
	}

	static paginateArray (allRecords, limit, page, mapper) {
		let start = (page - 1) * limit;
		let records = allRecords.slice(start, start + limit);

		if (mapper) {
			records = records.map(mapper);
		}

		return {
			page,
			limit,
			pages: Math.ceil(allRecords.length / limit),
			records,
		};
	}

	/**
	 * @returns {Promise<number>}
	 */
	async update () {
		if ('updatedAt' in this) {
			this.updatedAt = new Date();
		}

		await this.validate();

		return db(this.constructor.table).where(this.unique).update(this.dbIn());
	}

	async validate () {
		let result = this.constructor.schema.validate(this.dbIn(), { abortEarly: false });

		if (result.error) {
			throw result.error;
		}
	}

	toSqlInsert (onDuplicate = `id = last_insert_id(id); set @lastId${_.upperFirst(_.camelCase(this.constructor.table))} = last_insert_id()`) {
		return db(this.constructor.table).insert(this.dbIn()).toString().replace(/'(@lastId\w+)'/g, '$1') + ' on duplicate key update ' + onDuplicate + ';';
	}

	static fromJson (properties) {
		return new this(properties);
	}
}

module.exports = BaseModel;

module.exports.ProxyHandler = {
	/**
	 * @param {BaseModel} target
	 * @param {string} property
	 * @param {*} value
	 * @returns {boolean}
	 */
	set (target, property, value) {
		if (!target.properties.includes(property)) {
			target[property] = value;
			return true;
		}

		let setter = `set${property[0].toUpperCase()}${property.substr(1)}`;

		if (setter in this) {
			value = this[setter](target, value);
		}

		Joi.assert(value, target.constructor.schema.extract(property), `${property}:`);
		target[property] = value;
		return true;
	},
};
