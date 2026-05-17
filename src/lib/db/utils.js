export const listTables = async (db) => {
	return (await db('information_schema.tables')
		.whereRaw(`table_schema = database() and table_type = 'base table'`)
		.select(`table_name as table`)
	).map(({ table }) => table);
};

export const listViews = async (db) => {
	return (await db('information_schema.tables')
		.whereRaw(`table_schema = database() and table_type = 'view'`)
		.select(`table_name as table`)
	).map(({ table }) => table);
};
