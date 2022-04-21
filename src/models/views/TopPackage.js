class TopPackage {
	static get table () {
		return 'view_top_packages';
	}

	constructor (properties = {}) {
		/** @type {?string} */
		this.period = null;

		/** @type {Date} */
		this.date = null;

		/** @type {?string} */
		this.type = null;

		/** @type {?string} */
		this.name = null;

		/** @type {?number} */
		this.hitsRank = null;

		/** @type {?number} */
		this.hitsTypeRank = null;

		/** @type {number} */
		this.hits = 0;

		/** @type {?number} */
		this.bandwidthRank = null;

		/** @type {?number} */
		this.bandwidthTypeRank = null;

		/** @type {number} */
		this.bandwidth = 0;

		/** @type {?number} */
		this.prevHitsRank = null;

		/** @type {?number} */
		this.prevHitsTypeRank = null;

		/** @type {number} */
		this.prevHits = 0;

		/** @type {?number} */
		this.prevBandwidthRank = null;

		/** @type {?number} */
		this.prevBandwidthTypeRank = null;

		/** @type {number} */
		this.prevBandwidth = 0;

		Object.assign(this, properties);
	}
}

module.exports = TopPackage;
