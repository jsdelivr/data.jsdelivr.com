exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.alterTable('file', (table) => {
		table.specificType('fetchAttemptsLeft', 'tinyint').defaultTo(5).notNullable().index();
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
