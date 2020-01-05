exports.up = async (db) => {
	await db.schema.raw('SET @@foreign_key_checks = 0;');

	await db.schema.createTable('package', (table) => {
		table.increments();
		table.string('name');
		table.string('type');
		table.unique([ 'name', 'type' ]);
	});

	await db.schema.createTable('package_version', (table) => {
		table.increments();
		table.integer('packageId').unsigned().references('id').inTable('package').onUpdate('cascade').onDelete('cascade');
		table.string('version');
		table.unique([ 'packageId', 'version' ]);
	});

	await db.schema.createTable('file', (table) => {
		table.increments();
		table.integer('packageVersionId').unsigned().references('id').inTable('package_version').onUpdate('cascade').onDelete('cascade');
		table.string('filename');
		table.unique([ 'packageVersionId', 'filename' ]);
	});

	await db.schema.createTable('file_hits', (table) => {
		table.integer('fileId').unsigned().references('id').inTable('file').onUpdate('cascade').onDelete('cascade');
		table.date('date');
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.primary([ 'fileId', 'date' ]);
	});

	await db.schema.createTable('referrer', (table) => {
		table.increments();
		table.string('referrer').unique();
	});

	await db.schema.createTable('referrer_hits', (table) => {
		table.integer('referrerId').unsigned().references('id').inTable('referrer').onUpdate('cascade').onDelete('cascade');
		table.date('date');
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.primary([ 'referrerId', 'date' ]);
	});

	await db.schema.raw('SET @@foreign_key_checks = 1;');
};

exports.down = () => {};
