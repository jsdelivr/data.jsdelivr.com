const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await db.schema.alterTable('proxy_file_hits', (table) => {
		table.index('date');
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
