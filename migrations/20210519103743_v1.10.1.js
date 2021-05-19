exports.up = async (db) => {
	await db.schema.alterTable('log_file', (table) => {
		table.specificType('processAttemptsLeft', 'tinyint').defaultTo(10).notNullable().index();
	});
};

exports.down = () => {};
