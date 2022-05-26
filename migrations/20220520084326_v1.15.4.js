const _ = require('lodash');
const { continents, countries } = require('countries-list');
const updateSharedObjects = require('./shared/updateSharedObjects');

const periods = [
	'day', 'week', 'month', 'year', 'all',
	's-day', 's-week', 's-month', 's-year',
];

exports.up = async (db) => {
	await db.schema.raw(`drop event if exists network_packages_update`);
	await db.schema.raw(`drop event if exists top_package_files_update`);
	await db.schema.raw(`drop event if exists top_packages_update_2`);
	await db.schema.raw(`drop event if exists top_proxies_update`);

	await db.schema.createTable('continent', (table) => {
		table.string('code', 2).primary();
	});

	await db('continent').insert(_.map(continents, (continent, code) => ({ code })));

	await db.schema.createTable('country', (table) => {
		table.string('iso', 2).primary();
		table.string('continentCode').references('code').inTable('continent');
	});

	await db('country').insert(_.map(countries, (value, iso) => ({ iso, continentCode: value.continent })));

	await db.schema.createTable(`view_network_cdns`, (table) => {
		table.enum('period', periods);
		table.string('location');
		table.date('date');
		table.string('cdn');
		table.bigInteger('hits').unsigned().defaultTo(0).notNullable();
		table.bigInteger('bandwidth').unsigned().defaultTo(0).notNullable();
		table.bigInteger('prevHits').unsigned().defaultTo(0).notNullable();
		table.bigInteger('prevBandwidth').unsigned().defaultTo(0).notNullable();
		table.primary([ 'period', 'location', 'date', 'cdn' ]);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
