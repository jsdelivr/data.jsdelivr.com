const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.createTable('package_hits', (table) => {
		table.integer('packageId').unsigned().references('id').inTable('package').onUpdate('cascade').onDelete('cascade');
		table.date('date');
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.primary([ 'packageId', 'date' ]);
	});

	await db.schema.raw(sql);
};

exports.down = () => {};
