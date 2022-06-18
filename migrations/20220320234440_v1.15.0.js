const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await db.schema.createTable('platform', (table) => {
		table.increments();
		table.string('name').unique();
	});

	await db.schema.createTable('platform_version', (table) => {
		table.increments();
		table.integer('platformId').unsigned().references('id').inTable('platform').onUpdate('cascade').onDelete('cascade');
		table.string('version');
		table.string('versionName');
		table.unique([ 'platformId', 'version' ]);
	});

	await db.schema.createTable('country_platform_version_hits', (table) => {
		table.integer('platformVersionId').unsigned().references('id').inTable('platform_version').onUpdate('cascade').onDelete('cascade');
		table.string('countryIso', 2);
		table.date('date').index();
		table.bigInteger('hits').unsigned().defaultTo(0).notNullable();
		table.bigInteger('bandwidth').unsigned().defaultTo(0).notNullable();
		table.primary([ 'platformVersionId', 'countryIso', 'date' ]);
	});

	await db.schema.createTable('browser', (table) => {
		table.increments();
		table.string('name').unique();
	});

	await db.schema.createTable('browser_version', (table) => {
		table.increments();
		table.integer('browserId').unsigned().references('id').inTable('browser').onUpdate('cascade').onDelete('cascade');
		table.string('version');
		table.unique([ 'browserId', 'version' ]);
	});

	await db.schema.createTable('country_browser_version_hits', (table) => {
		table.integer('browserVersionId').unsigned().references('id').inTable('browser_version').onUpdate('cascade').onDelete('cascade');
		table.string('countryIso', 2);
		table.integer('platformId').unsigned().references('id').inTable('platform').onUpdate('cascade').onDelete('cascade');
		table.date('date').index();
		table.bigInteger('hits').unsigned().defaultTo(0).notNullable();
		table.bigInteger('bandwidth').unsigned().defaultTo(0).notNullable();
		table.primary([ 'browserVersionId', 'countryIso', 'platformId', 'date' ]);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
