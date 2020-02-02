const relativeDayUtc = require('relative-day-utc');
const allPeriodFrom = Date.UTC(2017, 7, 19);

module.exports = (period, date) => {
	return [ module.exports.periodToFromDate(period, date), relativeDayUtc(-2, date) ];
};

module.exports.periodToFromDate = (period, date) => {
	switch (period) {
		case 'day':
			return relativeDayUtc(-2, date);

		case 'week':
			return relativeDayUtc(-8, date);

		case 'month':
			return relativeDayUtc(-31, date);

		case 'year':
			return relativeDayUtc(-366, date);

		case 'all':
			return new Date(allPeriodFrom);

		default:
			throw new Error(`Invalid period value: ${period}`);
	}
};

module.exports.fill = (data, from, to, defaultValue = 0) => {
	let result = {};

	if (from.valueOf() === allPeriodFrom) {
		let keys = Object.keys(data);
		from = new Date(_.min(keys));
		to = new Date(_.max(keys));
	}

	for (let date = new Date(from); date <= to; date.setUTCDate(date.getUTCDate() + 1)) {
		let key = date.toISOString().substr(0, 10);
		result[key] = data[key] || defaultValue;
	}

	return result;
};
