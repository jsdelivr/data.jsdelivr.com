module.exports = {
	server: {
		host: 'http://localhost:4454',
		docsHost: 'http://localhost:4400',
		debugToken: '4f5dbb6427b186c054465729f5ed0fc6',
	},
	db: {
		connection: {
			port: 3316,
			database: 'jsdelivr-stats-test',
		},
	},
	redis: {
		port: 6389,
	},
};
