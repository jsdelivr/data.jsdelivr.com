class TopPlatformVersion {
	static get table () {
		return 'view_top_platform_versions';
	}

	constructor (properties = {}) {
		/** @type {?string} */
		this.period = null;

		/** @type {Date} */
		this.date = null;

		/** @type {?string} */
		this.locationType = null;

		/** @type {?string} */
		this.locationId = null;

		/** @type {?string} */
		this.name = null;

		/** @type {?string} */
		this.version = null;

		/** @type {?string} */
		this.versionName = null;

		/** @type {number} */
		this.share = 0;

		/** @type {number} */
		this.prevShare = 0;

		Object.assign(this, properties);
	}
}

module.exports = TopPlatformVersion;
