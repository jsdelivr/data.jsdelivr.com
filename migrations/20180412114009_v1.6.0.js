export const up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.alterTable('file', (table) => {
		table.binary('sha256', 32).index();
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

export const down = () => {};
