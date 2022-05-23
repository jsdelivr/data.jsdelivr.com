class NetworkCdn {
	static get table () {
		return 'view_network_cdns';
	}

	constructor (properties = {}) {
		/** @type {?string} */
		this.period = null;

		/** @type {Date} */
		this.date = null;

		/** @type {?string} */
		this.cdn = null;

		/** @type {number} */
		this.hits = 0;

		/** @type {number} */
		this.bandwidth = 0;

		/** @type {number} */
		this.prevHits = 0;

		/** @type {number} */
		this.prevBandwidth = 0;

		Object.assign(this, properties);
	}
}

module.exports = NetworkCdn;
