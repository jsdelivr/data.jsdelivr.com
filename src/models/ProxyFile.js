import Joi from 'joi';
import BaseModel from './BaseModel.js';

const schema = Joi.object({
	id: Joi.number().integer().min(0).required().allow(null),
	proxyId: Joi.number().integer().min(0).required().allow(null),
	filename: Joi.string().max(255).required(),
});

class ProxyFile extends BaseModel {
	static get table () {
		return 'proxy_file';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'id', 'filename', 'proxyId' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?number} */
		this.id = null;

		/** @type {?number} */
		this.proxyId = null;

		/** @type {?string} */
		this.filename = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseModel.ProxyHandler);
	}

	toSqlFunctionCall () {
		return db.raw(`set @lastIdProxyFile = updateOrInsertProxyFile(?, ?);`, [ this.proxyId, this.filename ]);
	}
}

export default ProxyFile;
