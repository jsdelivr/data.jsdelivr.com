const knex = require('knex');
const config = require('config');
const dbConfig = config.get('db');

module.exports = knex({
	client: dbConfig.type,
	connection: Object.assign({
		timezone: 'UTC',
		multipleStatements: true,
	}, dbConfig.connection),
	pool: {
		min: 0,
		max: 50,
		afterCreate (connection, callback) {
			connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED', callback);
		},
	},
});

/**
 * Add a few custom functions.
 */
module.exports.batchInsert = (queries) => {
	return db.transaction(async (trx) => {
		let max = 0, min;

		while (max < queries.length) {
			min = max;
			max = Math.min(max + 10000, queries.length);

			await trx.raw(queries.slice(min, max).join('\n'));
		}
	}).catch((e) => {
		// Handle deadlocks.
		if (e.sqlState !== '40001') {
			throw e;
		}

		return db.batchInsert(queries);
	});
};
