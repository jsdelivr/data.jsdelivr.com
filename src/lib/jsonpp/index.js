const constructors = new Map();

class Jsonpp {
	/**
	 * Add constructors for custom classes that will be serialized.
	 * @param {...function} constructor
	 */
	static addConstructor (...constructor) {
		constructor.forEach(constructor => constructors.set(constructor.name, constructor));
	}

	/**
	 * @param {string} type
	 * @returns {function}
	 * @private
	 */
	static getConstructor (type) {
		return constructors.get(type);
	}

	/**
	 * @param {*} value
	 * @returns {boolean}
	 */
	static isSerializable (value) {
		if (!value || typeof value !== 'object' || !value.constructor || value.constructor.name === 'Object' || value.constructor.name === 'Array') {
			return true;
		}

		return constructors.has(value.constructor.name);
	}

	/**
	 * @param {*} Constructor
	 * @param {Object} value
	 * @returns {Object}
	 * @private
	 */
	static makeObject (Constructor, value) {
		return typeof Constructor === 'function'
			? typeof Constructor.fromJSON === 'function'
				? Constructor.fromJSON(value)
				: /* istanbul ignore next */ new Constructor(value)
			: /* istanbul ignore next */ value;
	}

	/**
	 * @param {string} text
	 * @param {function} [reviver]
	 * @returns {*}
	 */
	static parse (text, reviver = (k, v) => v) {
		return JSON.parse(text, (key, value) => {
			if (!value || typeof value !== 'object' || typeof value.t !== 'string') {
				return reviver(key, value);
			} else if (value.t === '') {
				return reviver(key, value.v);
			}

			return reviver(key, Jsonpp.makeObject(Jsonpp.getConstructor(value.t), value.v));
		});
	}

	/**
	 * @param {*} value
	 * @param {function} [replacer]
	 * @param {string|number} [space
	 * @returns {string}
	 */
	static stringify (value, replacer = (k, v) => v, space) {
		let skip = 0;

		return JSON.stringify(value, (key, value) => {
			if (skip) {
				skip--;
				return value;
			}

			value = replacer(key, value);

			if (!value || typeof value !== 'object' || !value.constructor) {
				return value;
			}

			skip = 2;

			return {
				t: value.constructor.name === 'Object' || value.constructor.name === 'Array' ? '' : value.constructor.name,
				v: value,
			};
		}, space);
	}
}

module.exports = Jsonpp;
