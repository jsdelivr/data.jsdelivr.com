/**
 * Validates `body`, `params`, and `query` according to the provided schema
 * and copies the validated object to `ctx.state`. Properties not declared
 * in the schema are not copied.
 *
 * @param {{ body: Joi.Schema?, params: Joi.Schema?, query: Joi.Schema? }} options
 * @returns {Application.Middleware}
 */
module.exports = ({ body, params, query }) => {
	let validations = [
		{ name: 'body', schema: body },
		{ name: 'params', schema: params },
		{ name: 'query', schema: query },
	].filter(validation => validation.schema);

	return async (ctx, next) => {
		let isValid = validations.every((validation) => {
			let result = validateSingle(validation.schema, ctx[validation.name], ctx);
			ctx.state[validation.name] = result || {};

			return result;
		});

		return isValid && next();
	};
};

/**
 * @param {Joi.Schema} schema
 * @returns {Router.IParamMiddleware}
 */
module.exports.param = (schema) => {
	return async (value, ctx, next) => {
		return validateSingle(schema, value, ctx) && next();
	};
};

module.exports.single = validateSingle;

/**
 * @param {Joi.Schema} schema
 * @param {*} value
 * @param {Application.ParameterizedContext} ctx
 * @returns {boolean|*}
 */
function validateSingle (schema, value, ctx) {
	let result = schema.validate(value, {
		abortEarly: false,
		allowUnknown: true,
		stripUnknown: true,
		errors: {
			wrap: {
				label: '`',
			},
		},
	});

	if (result.error) {
		ctx.body = {
			status: 400,
			message: `Invalid parameter value: ${result.error.details.map(detail => detail.message).join(', ')}.`,
		};

		return false;
	}

	return result.value;
}
