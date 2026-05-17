import Joi from 'joi';
import BaseCacheModel from './BaseCacheModel.js';

const schema = Joi.object({
	iso: Joi.string().length(2).required(),
});

class Continent extends BaseCacheModel {
	static get table () {
		return 'continent';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'code' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?string} */
		this.code = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}
}

export default Continent;
