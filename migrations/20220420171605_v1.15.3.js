const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await db.schema.createTable(`view_top_packages`, (table) => {
		table.enum('period', [ 'day', 'week', 'month', 'year', 'all' ]);
		table.date('date');
		table.string('type');
		table.string('name');
		table.integer('rank').unsigned();
		table.integer('typeRank').unsigned();
		table.bigInteger('hits').unsigned().defaultTo(0).notNullable();
		table.bigInteger('bandwidth').unsigned().defaultTo(0).notNullable();
		table.primary([ 'period', 'date', 'type', 'name' ]);
		table.index([ 'period', 'date', 'type', 'hits' ]);
		table.index([ 'period', 'date', 'hits' ]);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
