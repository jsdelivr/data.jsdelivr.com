const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.alterTable('file_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('file_hits_cdn', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('package_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('referrer_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('other_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.raw(sql);
};

exports.down = () => {};
