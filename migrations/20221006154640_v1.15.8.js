const updateSharedObjects = require('./shared/updateSharedObjects');

const periods = [
	'day', 'week', 'month', 'year', 'all',
	's-day', 's-week', 's-month', 's-year',
];

exports.up = async (db) => {
	await db.schema.createTable(`view_top_proxy_files`, (table) => {
		table.enum('period', periods);
		table.date('date');
		table.string('name');
		table.string('filename');
		table.bigint('hits').unsigned().defaultTo(0);
		table.bigint('bandwidth').unsigned().defaultTo(0);
		table.primary([ 'period', 'date', 'name', 'filename' ]);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
