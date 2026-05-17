export const up = async (db) => {
	await db.schema.alterTable('referrer_hits', (table) => {
		table.index([ 'date' ]);
	});
};

export const down = () => {};
