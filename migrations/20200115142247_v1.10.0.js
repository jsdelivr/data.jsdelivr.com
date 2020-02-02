const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.createTable('platform', (table) => {
		table.increments();
		table.string('name').unique();
	});

	await db.schema.createTable('platform_version', (table) => {
		table.increments();
		table.integer('platformId').unsigned().references('id').inTable('platform').onUpdate('cascade').onDelete('cascade');
		table.string('version');
		table.unique([ 'platformId', 'version' ]);
	});

	await db.schema.createTable('country_platform_version_hits', (table) => {
		table.increments();
		table.string('countryIso', 2);
		table.integer('platformVersionId').unsigned().references('id').inTable('platform_version').onUpdate('cascade').onDelete('cascade');
		table.date('date').index();
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
		table.unique([ 'platformVersionId', 'countryIso', 'date' ], 'unique_platformVersionId_country_date');
	});

	await db.schema.createTable('browser', (table) => {
		table.increments();
		table.integer('platformId').unsigned().references('id').inTable('platform').onUpdate('cascade').onDelete('cascade');
		table.string('name');
		table.unique([ 'platformId', 'name' ]);
	});

	await db.schema.createTable('browser_version', (table) => {
		table.increments();
		table.integer('browserId').unsigned().references('id').inTable('browser').onUpdate('cascade').onDelete('cascade');
		table.string('version');
		table.unique([ 'browserId', 'version' ]);
	});

	await db.schema.createTable('country_browser_version_hits', (table) => {
		table.increments();
		table.string('countryIso', 2);
		table.integer('browserVersionId').unsigned().references('id').inTable('browser_version').onUpdate('cascade').onDelete('cascade');
		table.date('date').index();
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
		table.unique([ 'browserVersionId', 'countryIso', 'date' ], 'unique_browserVersionId_country_date');
	});

	await db.schema.raw(sql);
};

exports.down = () => {};
