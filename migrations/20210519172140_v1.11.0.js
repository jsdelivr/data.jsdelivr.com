const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.alterTable('package_version', (table) => {
		table.dropForeign([ 'packageId' ]);
		table.dropUnique([ 'packageId', 'version' ]);

		table.string('type', 16).notNullable().defaultTo('version');

		table.unique([ 'packageId', 'version', 'type' ]);
		table.foreign('packageId').references('id').inTable('package').onUpdate('cascade').onDelete('cascade');
	});

	await db.schema.raw(sql);
};

exports.down = () => {};
