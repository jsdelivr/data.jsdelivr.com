const updateSharedObjects = require('./shared/updateSharedObjects');
const periods = [ 'day', 'week', 'month', 'year', 'all' ];

exports.up = async (db) => {
	for (let period of periods) {
		await db.schema.alterTable(`view_top_packages_${period}`, (table) => {
			table.integer('typeRank').unsigned().index().after('rank');
		});
	}

	await updateSharedObjects(db);
};

exports.down = () => {};
