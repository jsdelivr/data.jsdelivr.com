exports.up = async (db) => {
	await db.schema.alterTable(`view_top_proxy_files`, (table) => {
		table.index([ 'period', 'date', 'name', 'hits' ]);
		table.index([ 'period', 'date', 'name', 'bandwidth' ]);
	});
};

exports.down = () => {};
