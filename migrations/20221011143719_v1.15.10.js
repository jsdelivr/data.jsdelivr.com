exports.up = async (db) => {
	await db.schema.alterTable('normalized_raw_log_file', (table) => {
		table.check('processed <= 1', [], 'processed_valid');
	});

	await db.schema.raw('drop trigger if exists normalized_raw_log_file_valid_insert;');
	await db.schema.raw('drop trigger if exists normalized_raw_log_file_valid_update;');

	await db.schema.alterTable('log_file', (table) => {
		table.check('processed <= 1', [], 'processed_valid');
	});

	await db.schema.raw('drop trigger if exists log_file_valid_insert;');
	await db.schema.raw('drop trigger if exists log_file_valid_update;');
};

exports.down = () => {};
