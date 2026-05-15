import fs from 'fs';

const sql = fs.readFileSync(new URL(`${import.meta.url}.sql`), 'utf8');

export const up = async (db) => {
	await db.schema.alterTable('file_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('file_hits_cdn', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('package_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('referrer_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.alterTable('other_hits', (table) => {
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
	});

	await db.schema.raw(sql);
};

export const down = () => {};
