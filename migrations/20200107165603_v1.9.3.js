import fs from 'fs';

const sql = fs.readFileSync(new URL(`${import.meta.url}.sql`), 'utf8');

export const up = async (db) => {
	await db.schema.createTable('package_version_hits', (table) => {
		table.integer('packageVersionId').unsigned().references('id').inTable('package_version').onUpdate('cascade').onDelete('cascade');
		table.date('date').index();
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
		table.primary([ 'packageVersionId', 'date' ]);
	});

	await db.schema.raw(sql);
};

export const down = () => {};
