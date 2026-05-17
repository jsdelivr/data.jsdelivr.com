import _ from 'lodash';
import fs from 'fs-extra';
import crypto from 'crypto';
import Bluebird from 'bluebird';
import { fileURLToPath } from 'url';
import config from 'config';
import readdir from 'recursive-readdir';

import { listTables, listViews } from '../src/lib/db/utils.js';
import { toIsoDate } from '../src/lib/date/index.js';

const localPath = file => fileURLToPath(new URL(file, import.meta.url));
const dbConfig = config.get('db');

export default async ({ databaseDate }) => {
	if (!dbConfig.connection.database.endsWith('-test') && dbConfig.connection.host !== 'localhost') {
		throw new Error(`Database name for test env needs to end with "-test" or the host must be "localhost". Got "${dbConfig.connection.database}"@"${dbConfig.connection.host}".`);
	}

	let [ dbEntry, currentHash ] = await Promise.all([
		getCurrentDbHash(),
		hashDbSetupFiles(),
	]);

	if (!process.env.FORCE_SETUP && dbEntry?.value === currentHash) {
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
		await db.schema.raw(fs.readFileSync(new URL('./data/schema.sql', import.meta.url), 'utf8').replace(/<<DATE>>/g, databaseDate));
		await db('_test').insert({ key: 'hash', value: currentHash });

		log.debug('Setup done.');
	}
};

async function getCurrentDbHash () {
	return db('_test').where({ key: 'hash' }).first().catch(() => null);
}

async function hashDbSetupFiles () {
	let files = await Bluebird.map(_.sortBy([
		...await readdir(localPath('../migrations')),
		...await readdir(localPath('../seeds')),
		localPath('./data/schema.sql'),
		localPath('./data/v1/entrypoints.json'),
		localPath('./setup.js'),
		localPath('./setup-db.js'),
		localPath('./setup-dev.js'),
	]), file => fs.readFile(file), { concurrency: 32 });

	return files.reduce((hash, file) => {
		return hash.update(file);
	}, crypto.createHash('sha256')).update(toIsoDate(new Date())).digest('hex');
}
