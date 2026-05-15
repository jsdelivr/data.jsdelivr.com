export const up = async (db) => {
	await db.schema.alterTable('package_listing', (table) => {
		table.datetime('updatedAt').index();
	});
};

export const down = () => {};
