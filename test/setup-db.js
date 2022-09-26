const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const config = require('config');
const readdir = require('recursive-readdir');

const { listTables, listViews } = require('../src/lib/db/utils');
const { toIsoDate } = require('../src/lib/date');
const dbConfig = config.get('db');

module.exports = async ({ databaseDate }) => {
	if (!dbConfig.connection.database.endsWith('-test') && dbConfig.connection.host !== 'localhost') {
		throw new Error(`Database name for test env needs to end with "-test" or the host must be "localhost". Got "${dbConfig.connection.database}"@"${dbConfig.connection.host}".`);
	}

	let [ dbEntry, currentHash ] = await Promise.all([
		getCurrentDbHash(),
		hashDbSetupFiles(),
	]);

	if (dbEntry?.value === currentHash) {
		log.debug(`Database setup didn't change since last run. Skipping.`);
	} else {
		log.debug('Dropping existing tables.');
		await db.raw('SET @@foreign_key_checks = 0;');
		await Bluebird.each(listTables(db), table => db.schema.raw(`drop table \`${table}\``));
		await Bluebird.each(listViews(db), table => db.schema.raw(`drop view \`${table}\``));
		await db.raw('SET @@foreign_key_checks = 1;');

		log.debug('Setting up the database.');
		await db.migrate.latest();

		log.debug('Inserting test data.');
		await db.seed.run();

		log.debug('Generating materialized views.');
		await db.schema.raw(fs.readFileSync(__dirname + '/data/schema.sql', 'utf8').replace(/<<DATE>>/g, databaseDate));
		await db('_test').insert({ key: 'hash', value: currentHash });

		log.debug('Setup done.');
	}
};

async function getCurrentDbHash () {
	return db('_test').where({ key: 'hash' }).first().catch(() => null);
}

async function hashDbSetupFiles () {
	let files = await Bluebird.map(_.sortBy([
		...await readdir(path.join(__dirname, '../migrations')),
		...await readdir(path.join(__dirname, '../seeds')),
		path.join(__dirname, '/data/schema.sql'),
		path.join(__dirname, '/data/v1/entrypoints.json'),
		path.join(__dirname, '/setup.js'),
		path.join(__dirname, '/setup-db.js'),
		path.join(__dirname, '/setup-dev.js'),
	]), file => fs.readFile(file), { concurrency: 32 });

	return files.reduce((hash, file) => {
		return hash.update(file);
	}, crypto.createHash('sha256')).update(toIsoDate(new Date())).digest('hex');
}
