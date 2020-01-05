exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.alterTable('referrer_hits', (table) => {
		table.bigInteger('hits').alter();
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
