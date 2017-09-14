const relativeDayUtc = require('relative-day-utc');

module.exports = (from, to, defaultDays = 30) => {
	let range = [];
	let datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
	let match;

	// Value for the second parameter (month) for UTC.Date() is zero-based.
	// All other parameters are one-based.
	if (from && (match = datePattern.exec(from))) {
		let date = new Date(Date.UTC(match[1], match[2] - 1, match[3]));

		if (date <= relativeDayUtc(-2)) {
			range.push(date);
		}
	}

	if (!range.length && to) {
		range.push(undefined);
	}

	if (to && (match = datePattern.exec(to))) {
		let date = new Date(Date.UTC(match[1], match[2] - 1, match[3]));

		if (date <= relativeDayUtc(-2)) {
			range.isStatic = true;
			range.push(date);
		}
	}

	if (!range.length) {
		let date = relativeDayUtc(-2);
		range.push(relativeDayUtc(-2 - defaultDays + 1), date);
	} else if (range.length === 1) {
		range.push(relativeDayUtc(-2));
	}

	return range;
};

module.exports.fill = (data, from, to, defaultValue = 0) => {
	let result = {};

	for (let date = new Date(from); date <= to; date.setDate(date.getDate() + 1)) {
		let key = date.toISOString().substr(0, 10);
		result[key] = data[key] || defaultValue;
	}

	return result;
};
