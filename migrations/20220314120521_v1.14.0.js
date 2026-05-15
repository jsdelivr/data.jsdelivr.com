import updateSharedObjects from './shared/updateSharedObjects.js';
const periods = [ 'day', 'week', 'month', 'year', 'all' ];

export const up = async (db) => {
	for (let period of periods) {
		await db.schema.alterTable(`view_top_packages_${period}`, (table) => {
			table.integer('typeRank').unsigned().index().after('rank');
		});
	}

	await updateSharedObjects(db);
};

export const down = () => {};
