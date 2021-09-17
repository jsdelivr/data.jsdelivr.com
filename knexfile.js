const _ = require('lodash');
const config = require('config');
const dbConfig = config.get('db');

// WARNING: This configuration is now used for both the CLI and the application.
module.exports = _.merge(...[ 'development', 'production', 'staging', 'test' ].map((environment) => {
	return {
		[environment]: {
			client: dbConfig.type,
			connection: Object.assign({
				timezone: 'UTC',
				multipleStatements: true,
			}, dbConfig.connection),
			pool: {
				min: 2,
				max: 40,
				propagateCreateError: false,
				afterCreate (connection, callback) {
					connection.query('SET names utf8mb4 COLLATE utf8mb4_unicode_ci; SET TRANSACTION ISOLATION LEVEL READ COMMITTED;', callback);
				},
			},
			seeds: {
				directory: `./seeds/${environment}`,
			},
			acquireConnectionTimeout: 10000,
		},
	};
}));
