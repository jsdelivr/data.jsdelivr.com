import updateSharedObjects from './shared/updateSharedObjects.js';

export const up = async (db) => {
	await db.schema.alterTable('view_top_package_files', (table) => {
		table.integer('idx').after('version');
		table.dropIndex([ 'name', 'version' ]);
		table.index([ 'name', 'version', 'idx' ]);
	});

	await updateSharedObjects(db);
};

export const down = () => {};
