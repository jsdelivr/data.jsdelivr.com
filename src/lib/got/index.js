const got = require('got');
const config = require('config');
const { userAgent } = config.get('server');

module.exports = got.extend({
	headers: {
		'User-Agent': userAgent,
	},
});
