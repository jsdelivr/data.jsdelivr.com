import fs from 'fs';

const sql = fs.readFileSync(new URL(`${import.meta.url}.sql`), 'utf8');

export const up = async (db) => {
	await db.schema.alterTable('logs', (table) => {
		table.bigInteger('records').alter();
		table.bigInteger('megabytesLogs').alter();
		table.bigInteger('megabytesTraffic').alter();
	});

	await db.schema.alterTable('other_hits', (table) => {
		table.bigInteger('hits').alter();
	});

	await db.schema.raw(sql);
};

export const down = () => {};
