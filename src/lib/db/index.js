const knex = require('knex');
const config = require('config');
const dbConfig = config.get('db');

module.exports = knex({
	client: dbConfig.type,
	connection: dbConfig.connection,
});
