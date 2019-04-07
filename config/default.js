module.exports = {
	server: {
		port: 4454,
		debugToken: '',
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
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
			sourceUrl: [ 'https://registry.npmjs.org', 'https://registry.npmjs.cf' ],
			maxAge: 5 * 60,
		},
		gh: {
			apiToken: '',
			sourceUrl: 'https://api.github.com',
			maxAge: 30 * 60,
		},
		maxAgeStatic: 365 * 24 * 60 * 60,
		maxStaleStatic: 24 * 60 * 60,
		maxAgeShort: 60,
		maxStaleShort: 60 * 60,
	},
};
