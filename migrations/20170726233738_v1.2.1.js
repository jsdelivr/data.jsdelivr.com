exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.alterTable('logs', (table) => {
		table.dropColumn('bytes');
		table.integer('megabytes').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
