import fs from 'fs';

const sql = fs.readFileSync(new URL(`${import.meta.url}.sql`), 'utf8');

export const up = async (db) => {
	await db.schema.raw(sql);
};

export const down = () => {};
