class NetworkCountry {
	static get table () {
		return 'view_network_countries';
	}

	constructor (properties = {}) {
		/** @type {?string} */
		this.period = null;

		/** @type {Date} */
		this.date = null;

		/** @type {?string} */
		this.countryIso = null;

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

module.exports = NetworkCountry;
