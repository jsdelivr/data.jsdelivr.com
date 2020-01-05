exports.up = async (db) => {
	await db.schema.alterTable('package_listing', (table) => {
		table.datetime('updatedAt').index();
	});
};

exports.down = () => {};
