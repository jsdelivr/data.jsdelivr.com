const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.alterTable('package_version', (table) => {
		table.enum('type', [ 'version', 'commit', 'branch' ]).notNullable().defaultTo('version');
	});

	await db.schema.raw(sql);
};

exports.down = () => {};
