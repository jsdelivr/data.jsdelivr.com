exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.createTable('other_hits', (table) => {
		table.date('date').primary();
		table.integer('hits').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
