exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.createTable('log_file', (table) => {
		table.increments();
		table.string('filename').unique();
		table.datetime('updatedAt');
		table.boolean('processed');
		table.collate('utf8mb4_bin');
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
