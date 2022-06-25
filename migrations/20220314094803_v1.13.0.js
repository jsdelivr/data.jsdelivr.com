const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await db.schema.alterTable('package', (table) => {
		table.tinyint('isPrivate').defaultTo(0).notNullable();
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
