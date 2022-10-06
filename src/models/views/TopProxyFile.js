class TopProxyFile {
	static get table () {
		return 'view_top_proxy_files';
	}

	constructor (properties = {}) {
		/** @type {?string} */
		this.period = null;

		/** @type {Date} */
		this.date = null;

		/** @type {?string} */
		this.name = null;

		/** @type {?string} */
		this.filename = null;

		/** @type {number} */
		this.hits = 0;

		/** @type {number} */
		this.bandwidth = 0;

		Object.assign(this, properties);
	}
}

module.exports = TopProxyFile;
