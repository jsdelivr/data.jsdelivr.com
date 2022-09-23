const relativeDayUtc = require('relative-day-utc');
const { toIsoDate, toIsoMonth, toIsoYear } = require('../../lib/date');

const floatingPeriodDurations = { day: 1, week: 7, month: 30, year: 365 };
const floatingPeriods = [ ...Object.keys(floatingPeriodDurations), 'all' ];
const allPeriodFrom = Date.UTC(2017, 7, 19);
const staticPeriods = [ 's-month', 's-year' ];
const staticPeriodPattern = /^(\d{4})(?:-(\d{2}))?$/;

module.exports = (period, date) => {
	return [
		module.exports.periodToFromDate(period, date),
		module.exports.periodToToDate(period, date),
	];
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

		case 's-month':
		case 's-year':
			return new Date(date);

		default:
			throw new Error(`Invalid period value: ${period}`);
	}
};

module.exports.periodToToDate = (period, date) => {
	switch (period) {
		case 'day':
		case 'week':
		case 'month':
		case 'year':
		case 'all':
			return relativeDayUtc(-2, date);

		case 's-month':
			return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));

		case 's-year':
			return new Date(Date.UTC(date.getUTCFullYear() + 1, date.getUTCMonth(), 0));

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
		let key = toIsoDate(date);
		result[key] = data[key] || defaultValue;
	}

	return result;
};

module.exports.getDuration = (period) => {
	if (module.exports.isFloatingPeriod(period)) {
		return floatingPeriodDurations[period];
	}

	if (module.exports.isStaticPeriod(period)) {
		let result = module.exports.parseStaticPeriod(period);

		if (result) {
			if (result.period === 's-month') {
				return new Date(Date.UTC(result.date.getUTCFullYear(), result.date.getUTCMonth() + 1, 0)).getUTCDate();
			} else if (result.period === 's-year') {
				return new Date(Date.UTC(result.date.getUTCFullYear(), 1, 29)).getUTCDate() === 29 ? 366 : 365;
			}
		}

		return result;
	}
};

module.exports.isFloatingPeriod = (period) => {
	return floatingPeriods.includes(period);
};

module.exports.isStaticPeriod = (period) => {
	return staticPeriods.includes(period) || staticPeriodPattern.test(period);
};

module.exports.parseFloatingPeriod = (period, date = new Date()) => {
	return {
		date: relativeDayUtc(0, date),
		period,
		toString () {
			return period;
		},
	};
};

module.exports.parseStaticPeriod = (period, date = new Date()) => {
	date = relativeDayUtc(-4, date);
	let match;

	if (period === 's-month') {
		date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
	} else if (period === 's-year') {
		date = new Date(Date.UTC(date.getUTCFullYear() - 1, 0, 1));
	} else if (match = staticPeriodPattern.exec(period)) {
		date = new Date(period);
		period = match[2] ? 's-month' : 's-year';

		if (isNaN(date.valueOf())) {
			return;
		}
	}

	return {
		date,
		period,
		toString () {
			return period;
		},
	};
};

module.exports.periodToString = (period, date) => {
	if (module.exports.isFloatingPeriod(period)) {
		return period;
	}

	switch (period) {
		case 's-month':
			return toIsoMonth(date);

		case 's-year':
			return toIsoYear(date);

		default:
			throw new Error(`Invalid period value: ${period}`);
	}
};
