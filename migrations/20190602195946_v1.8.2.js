import fs from 'fs';

const sql = fs.readFileSync(new URL(`${import.meta.url}.sql`), 'utf8');

export const up = async (db) => {
	await db.schema.createTable('package_hits', (table) => {
		table.integer('packageId').unsigned().references('id').inTable('package').onUpdate('cascade').onDelete('cascade');
		table.date('date');
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.primary([ 'packageId', 'date' ]);
	});

	await db.schema.raw(sql);
};

export const down = () => {};
