import updateSharedObjects from './shared/updateSharedObjects.js';

export const up = async (db) => {
	await updateSharedObjects(db);
};

export const down = () => {};
