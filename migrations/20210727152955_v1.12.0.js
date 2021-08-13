const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.createTable('cdnjs_package', (table) => {
		table.string('name');
		table.string('version');
		table.string('filename');
		table.primary([ 'name', 'version' ]);
		table.charset('utf8mb4');
		table.collate('utf8mb4_bin');
	});

	await db.schema.createTable('package_entrypoints', (table) => {
		table.string('type');
		table.string('name');
		table.string('version');
		table.text('entrypoints', 'mediumtext');
		table.datetime('updatedAt').index();
		table.primary([ 'type', 'name', 'version' ]);
		table.charset('utf8mb4');
		table.collate('utf8mb4_bin');
	});

	await db.schema.raw('alter table package_entrypoints row_format = compressed;');

	await db.schema.createTable('view_top_package_files', (table) => {
		table.string('name');
		table.string('version');
		table.string('filename');
		table.date('date');
		table.index([ 'name', 'version' ]);
	});

	await db.schema.raw(sql);
};

exports.down = () => {};
