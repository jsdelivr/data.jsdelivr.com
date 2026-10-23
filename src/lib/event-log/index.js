import apmClient from 'elastic-apm-node';

// Matches origin's per-reporting-interval event counters, independent of trace sampling.
class EventLog {
	constructor (client) {
		this.client = client;
		this.events = Object.create(null);
	}

	/**
	 * @param {string} event Bounded metric name; never include a resource key.
	 * @param {number} [amount]
	 * @returns {EventLog}
	 */
	log (event, amount = 1) {
		if (this.events[event] === undefined) {
			this.events[event] = 0;

			if (this.client._conf.active) {
				this.client.registerMetric(event, () => {
					let value = this.events[event];
					this.events[event] = 0;
					return value;
				});
			}
		}

		this.events[event] += amount;
		return this;
	}
}

export { EventLog };
export default new EventLog(apmClient);
