const knex = require('knex');
const config = require('config');
const dbConfig = config.get('db');

module.exports = knex({
	client: dbConfig.type,
	connection: Object.assign({
		timezone: 'UTC',
		multipleStatements: true,
	}, dbConfig.connection),
	pool: { min: 0, max: 50 },
});
