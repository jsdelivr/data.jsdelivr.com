class RemoteResource extends Error {
	/**
	 * @param {number} statusCode
	 * @param {Record<string, string>} headers
	 * @param {RemoteResource[]} parts
	 * @param {*} data
	 * @param {*} props
	 * @param {Error|*} [error]
	 * @param {boolean} [isFromCache]
	 */
	constructor ({ statusCode, headers = {}, parts = [], data, ...props }, error = null, isFromCache = false) {
		super(`Response status ${statusCode}.`);

		/** @type {number} */
		this.age = 0;

		/** @type {number} */
		this.statusCode = statusCode;

		/** @type {Record<string, string>} */
		this.headers = headers;

		/** @type {RemoteResource[]} */
		this.parts = parts;

		/** @type {*} */
		this.data = data;

		/** @type {*} */
		this.props = props;

		/** @type {Error|*} */
		this.error = error;

		/** @type {boolean} */
		this.isFromCache = isFromCache;
	}

	get defaultTtlInternalRevalidate () {
		return 0;
	}

	get defaultTtlInternalStore () {
		return 0;
	}

	get isStale () {
		return this.age > this.ttlInternalRevalidate;
	}

	get staleIfError () {
		return Infinity;
	}

	get staleWhileRevalidate () {
		return this.ttlInternalRevalidate * 2;
	}

	get ttlInternalRevalidate () {
		if (this._ttlInternalRevalidate) {
			return this._ttlInternalRevalidate;
		}

		return this.defaultTtlInternalRevalidate;
	}

	set ttlInternalRevalidate (value) {
		this._ttlInternalRevalidate = value;
	}

	get ttlInternalStore () {
		if (this._ttlInternalStore) {
			return this._ttlInternalStore;
		}

		return this.defaultTtlInternalStore;
	}

	set ttlInternalStore (value) {
		this._ttlInternalStore = value;
	}

	static fromJSON (props) {
		return new this(props, props.error, true);
	}
}

module.exports = RemoteResource;
