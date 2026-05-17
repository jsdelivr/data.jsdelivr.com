import fs from 'fs';

const sql = fs.readFileSync(new URL(`${import.meta.url}.sql`), 'utf8');

export const up = async (db) => {
	await db.schema.alterTable('package_version', (table) => {
		table.enum('type', [ 'version', 'commit', 'branch' ]).notNullable().defaultTo('version').index();
	});

	await db.schema.raw(sql);
};

export const down = () => {};
