class RemoteResource extends Error {
	constructor ({ statusCode, headers = {}, parts = [], data, ...props }, error = null, isFromCache = false) {
		super(`Response status ${statusCode}.`);

		this.age = 0;
		this.staleIfError = true;
		this.staleWhileRevalidate = true;

		this.statusCode = statusCode;
		this.headers = headers;
		this.parts = parts;
		this.data = data;
		Object.assign(this, props);

		this.error = error;
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

	toJSON () {
		return _.omit(this, [ 'age', 'staleIfError', 'staleWhileRevalidate', 'isFromCache' ]);
	}

	static fromJSON (props) {
		return new this(props, props.error, true);
	}
}

module.exports = RemoteResource;
