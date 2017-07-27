module.exports = {
	logger: {
		path: './logs/',
	},
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
			user: '',
			password: '',
			database: 'jsdelivr-stats',
		},
	},
	redis: {
		db: 0,
		host: '',
		port: '',
		password: '',
	},
	v1: {
		cdn: {
			sourceUrl: 'https://cdn.jsdelivr.net',
		},
		npm: {
			sourceUrl: [ 'https://registry.npmjs.org', 'https://registry.npmjs.cf' ],
			maxAge: 60,
		},
		gh: {
			apiToken: '',
			sourceUrl: 'api.github.com',
			maxAge: 10 * 60,
		},
		maxAgeStatic: 365 * 24 * 60 * 60,
	},
};
