import updateSharedObjects from './shared/updateSharedObjects.js';

export const up = async (db) => {
	await db.schema.alterTable('package', (table) => {
		table.tinyint('isPrivate').defaultTo(0).notNullable();
	});

	await updateSharedObjects(db);
};

export const down = () => {};
