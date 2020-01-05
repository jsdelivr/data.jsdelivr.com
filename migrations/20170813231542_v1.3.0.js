exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.alterTable('log_file', (table) => {
		table.date('date');
	});

	await db.schema.createTable('file_hits_cdn', (table) => {
		table.string('cdn');
		table.integer('fileId').unsigned().references('id').inTable('file').onUpdate('cascade').onDelete('cascade');
		table.date('date');
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.primary([ 'cdn', 'fileId', 'date' ]);
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
