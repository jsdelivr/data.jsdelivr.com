const updateSharedObjects = require('./shared/updateSharedObjects');
const locationTypes = [ 'continent', 'country', 'global' ];

const periods = [
	'day', 'week', 'month', 'year', 'all',
	's-day', 's-week', 's-month', 's-year',
];

exports.up = async (db) => {
	await db.schema.createTable(`view_top_platforms`, (table) => {
		table.enum('period', periods);
		table.date('date');
		table.enum('locationType', locationTypes);
		table.string('locationId', 2);
		table.string('name');
		table.float('share').unsigned();
		table.float('prevShare').unsigned();
		table.primary([ 'period', 'date', 'locationType', 'locationId', 'name' ]);
	});

	await db.schema.createTable(`view_top_platform_versions`, (table) => {
		table.enum('period', periods);
		table.date('date');
		table.enum('locationType', locationTypes);
		table.string('locationId', 2);
		table.string('name');
		table.string('version');
		table.string('versionName');
		table.float('share').unsigned();
		table.float('prevShare').unsigned();
		table.primary([ 'period', 'date', 'locationType', 'locationId', 'name', 'version' ]);
	});

	await db.schema.createTable(`view_top_platform_browsers`, (table) => {
		table.enum('period', periods);
		table.date('date');
		table.enum('locationType', locationTypes);
		table.string('locationId', 2);
		table.string('name');
		table.string('browser');
		table.float('share').unsigned();
		table.float('prevShare').unsigned();
		table.primary([ 'period', 'date', 'locationType', 'locationId', 'name', 'browser' ]);
	});

	await db.schema.createTable(`view_top_platform_countries`, (table) => {
		table.enum('period', periods);
		table.date('date');
		table.enum('locationType', locationTypes);
		table.string('locationId', 2);
		table.string('name');
		table.string('countryIso', 2);
		table.float('share').unsigned();
		table.float('prevShare').unsigned();
		table.primary([ 'period', 'date', 'locationType', 'locationId', 'name', 'countryIso' ]);
	});

	await db.schema.createTable(`view_top_platform_version_countries`, (table) => {
		table.enum('period', periods);
		table.date('date');
		table.enum('locationType', locationTypes);
		table.string('locationId', 2);
		table.string('name');
		table.string('version');
		table.string('countryIso', 2);
		table.float('share').unsigned();
		table.float('prevShare').unsigned();
		table.primary([ 'period', 'date', 'locationType', 'locationId', 'name', 'version', 'countryIso' ]);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
