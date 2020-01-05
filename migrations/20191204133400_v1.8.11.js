exports.up = async (db) => {
	await db.schema.alterTable('referrer_hits', (table) => {
		table.index([ 'date' ]);
	});
};

exports.down = () => {};
