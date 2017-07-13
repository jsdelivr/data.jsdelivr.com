const config = require('config');
const dbConfig = config.get('db');

module.exports = {
	client: dbConfig.type,
	connection: dbConfig.connection,
	migrations: {
		tableName: 'knex_migrations',
	},
};
