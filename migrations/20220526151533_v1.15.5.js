const updateSharedObjects = require('./shared/updateSharedObjects');

const periods = [
	'day', 'week', 'month', 'year', 'all',
	's-day', 's-week', 's-month', 's-year',
];

exports.up = async (db) => {
	await db.schema.createTable(`view_network_countries`, (table) => {
		table.enum('period', periods);
		table.date('date');
		table.string('countryIso');
		table.bigInteger('hits').unsigned().defaultTo(0).notNullable();
		table.bigInteger('bandwidth').unsigned().defaultTo(0).notNullable();
		table.bigInteger('prevHits').unsigned().defaultTo(0).notNullable();
		table.bigInteger('prevBandwidth').unsigned().defaultTo(0).notNullable();
		table.primary([ 'period', 'date', 'countryIso' ]);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
