exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.alterTable('logs', (table) => {
		table.renameColumn('lines', 'records');
		table.renameColumn('megabytes', 'megabytesLogs');
		table.integer('megabytesTraffic').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
