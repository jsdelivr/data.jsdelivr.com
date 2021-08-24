class RemoteResourceSerializableError extends Error {
	constructor (originalError) {
		super();

		this.name = this.constructor.name;
		this.originalName = originalError.name;
		this.code = originalError.code;
		this.message = originalError.message;
	}

	static fromJSON (props) {
		return Object.assign(new this({}), props);
	}
}

module.exports = RemoteResourceSerializableError;
