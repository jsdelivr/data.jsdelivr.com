const Joi = require('joi');
const BaseModel = require('./BaseModel');

const schema = {
	id: Joi.number().integer().min(1).required().disallow(null),
	path: Joi.string().required(),
};

class ProxyModel extends BaseModel {
	static get table () {
		return 'proxy';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {number} */
		this.id = 0;

		/** @type {string} */
		this.path = '';

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	static async getProxyList () {
		return db.select().table(this.table);
	}
}

module.exports = ProxyModel;
