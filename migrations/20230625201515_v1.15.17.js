import updateSharedObjects from './shared/updateSharedObjects.js';

export const up = async (db) => {
	await db.schema.alterTable('proxy_file_hits', (table) => {
		table.index('date');
	});

	await updateSharedObjects(db);
};

export const down = () => {};
