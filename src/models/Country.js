import Joi from 'joi';
import BaseCacheModel from './BaseCacheModel.js';

const schema = Joi.object({
	iso: Joi.string().length(2).required(),
});

class Country extends BaseCacheModel {
	static get table () {
		return 'country';
	}

	static get schema () {
		return schema;
	}

	static get unique () {
		return [ 'iso' ];
	}

	constructor (properties = {}) {
		super();

		/** @type {?string} */
		this.iso = null;

		Object.assign(this, properties);
		return new Proxy(this, BaseCacheModel.ProxyHandler);
	}
}

export default Country;
