const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.createTable('country_cdn_hits', (table) => {
		table.string('countryIso', 2);
		table.string('cdn', 2);
		table.date('date').index();
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
		table.primary([ 'cdn', 'countryIso', 'date' ]);
	});

	await db.schema.alterTable('log_file', (table) => {
		table.index([ 'updatedAt' ]);
		table.index([ 'processed' ]);
		table.index([ 'date' ]);
	});

	await db.schema.createTable('normalized_raw_log_file', (table) => {
		table.increments();
		table.string('filename');
		table.integer('fileModificationTime').unsigned();
		table.datetime('updatedAt').index();
		table.boolean('processed').index();
		table.datetime('date').index();
		table.unique([ 'filename', 'fileModificationTime' ]);
	});

	await db.schema.alterTable('proxy_hits', (table) => {
		table.index([ 'date' ]);
	});

	await db.schema.dropTable('file_hits_cdn');
	await db.schema.raw(sql);
};

exports.down = () => {};
