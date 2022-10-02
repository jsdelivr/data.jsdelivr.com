const Joi = require('joi');
const { continents, countries } = require('countries-list');
const dateRange = require('../utils/dateRange');

const primitives = {
	by:
		Joi.valid('hits', 'bandwidth').default('hits'),

	continent:
		Joi.valid(...Object.keys(continents)).messages({
			'*': '{{#label}} must be a valid continent code in uppercase',
		}),

	country:
		Joi.valid(...Object.keys(countries)).messages({
			'*': '{{#label}} must be a valid ISO 3166-1 alpha-2 country code in uppercase',
		}),

	hash:
		Joi.string().hex().length(64).required()
			.messages({ '*': 'must be a hex-encoded sha256 hash' })
			.prefs({ abortEarly: true }),

	limit:
		Joi.number().integer().positive().max(100).default(100),

	page:
		Joi.number().integer().positive().max(100).default(1),

	period:
		Joi.custom((value, helpers) => {
			let result = dateRange.parse(value);

			if (!result) {
				return helpers.error('any.invalid');
			}

			let range = dateRange(result.period, result.date);

			if (range[1] > Date.now()) {
				return helpers.error('period.future');
			}

			return { ...result, range };
		}).messages({
			'*': '{{#label}} must be one of [day, week, month, year, s-month, s-year] or a valid date in one of the following ISO formats [YYYY, YYYY-MM]',
			'period.future': '{{#label}} cannot end in the future',
		}).default(() => {
			let result = dateRange.parseFloatingPeriod('month');
			let range = dateRange(result.period, result.date);
			return { ...result, range };
		}),

	periodFloating:
		Joi.custom((value, helpers) => {
			if (!dateRange.isFloatingPeriod(value)) {
				return helpers.error('any.invalid');
			}

			let result = dateRange.parseFloatingPeriod(value);
			let range = dateRange(result.period, result.date);

			return { ...result, range };
		}).messages({
			'*': '{{#label}} must be one of [day, week, month, year]',
		}).default(() => {
			let result = dateRange.parseFloatingPeriod('month');
			let range = dateRange(result.period, result.date);
			return { ...result, range };
		}),

	periodStatic:
		Joi.custom((value, helpers) => {
			if (!dateRange.isStaticPeriod(value)) {
				return helpers.error('any.invalid');
			}

			let result = dateRange.parseStaticPeriod(value);

			if (!result) {
				return helpers.error('any.invalid');
			}

			let range = dateRange(result.period, result.date);

			if (range[1] > Date.now()) {
				return helpers.error('period.future');
			}

			return { ...result, range };
		}).messages({
			'*': '{{#label}} must be one of [s-month, s-year] or a valid date in one of the following ISO formats [YYYY, YYYY-MM]',
			'period.future': '{{#label}} cannot end in the future',
		}).default(() => {
			let result = dateRange.parseStaticPeriod('s-month');
			let range = dateRange(result.period, result.date);
			return { ...result, range };
		}),

	specifier:
		Joi.string(),

	statsBadgeType:
		Joi.valid('hits', 'rank', 'type-rank').default('hits'),

	structure:
		Joi.valid('flat', 'tree').default('tree'),

	type:
		Joi.valid('gh', 'npm'),
};

const composedTypes = {
	paginatedStats: { limit: primitives.limit, page: primitives.page },
};

const composedSchemas = {
	location: Joi.object({ continent: primitives.continent, country: primitives.country })
		.oxor('continent', 'country')
		.messages({ 'object.oxor': 'object contains a conflict between optional exclusive peers {{#peersWithLabels}}' }),
};

module.exports = {
	...primitives,
	...composedTypes,
	...composedSchemas,
};
