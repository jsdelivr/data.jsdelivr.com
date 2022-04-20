exports.up = async (db) => {
	await db.schema.alterTable('proxy', (table) => {
		table.string('name').after('id').unique();
	});

	await db.raw(`update proxy set name = replace(substring(path, 2), '/', '-')`);
};

exports.down = () => {};
