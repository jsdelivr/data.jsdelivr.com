const { version } = require('../package.json');

module.exports = {
	server: {
		host: 'https://data.jsdelivr.com',
		port: 4454,
		debugToken: '',
		userAgent: `data.jsdelivr.com/${version} (https://github.com/jsdelivr/data.jsdelivr.com)`,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Cross-Origin-Resource-Policy': 'cross-origin',
			'Timing-Allow-Origin': '*',
			'Vary': 'Accept-Encoding',
		},
	},
	db: {
		type: 'mysql',
		connection: {
			host: 'localhost',
			port: 3306,
			user: 'root',
			password: '',
			database: 'jsdelivr-stats',
		},
	},
	redis: {
		db: 0,
		host: '',
		port: '',
		password: undefined,
	},
	v1: {
		cdn: {
			sourceUrl: 'https://cdn.jsdelivr.net',
		},
		npm: {
			sourceUrl: [ 'https://registry.npmjs.org' ],
		},
		gh: {
			apiToken: '',
			sourceUrl: 'https://api.github.com',
		},
		maxAgeStatic: 365 * 24 * 60 * 60,
		maxStaleStatic: 24 * 60 * 60,
		maxAgeOneWeek: 7 * 24 * 60 * 60,
		maxStaleOneWeek: 24 * 60 * 60,
		maxAgeShort: 5 * 60,
		maxStaleShort: 60 * 60,
		maxStaleError: 24 * 60 * 60,
	},
};
