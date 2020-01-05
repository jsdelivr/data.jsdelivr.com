exports.up = async (db) => {
	await db.schema.alterTable('file_hits', (table) => {
		table.index([ 'date' ]);
	});

	await db.schema.alterTable('file_hits_cdn', (table) => {
		table.index([ 'date' ]);
	});

	await db.schema.alterTable('package_hits', (table) => {
		table.index([ 'date' ]);
	});
};

exports.down = () => {};
