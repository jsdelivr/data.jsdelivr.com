import fs from 'fs';

const sql = fs.readFileSync(new URL(`${import.meta.url}.sql`), 'utf8');

export const up = async (db) => {
	await db.schema.createTable('proxy', (table) => {
		table.increments();
		table.string('path').unique();
	});

	await db.schema.createTable('proxy_hits', (table) => {
		table.integer('proxyId').unsigned().references('id').inTable('proxy').onUpdate('cascade').onDelete('cascade');
		table.date('date');
		table.integer('hits').unsigned().defaultTo(0).notNullable();
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable();
		table.primary([ 'proxyId', 'date' ]);
	});

	await db('proxy').insert([
		{ path: '/wp/plugins' },
		{ path: '/wp/themes' },
		{ path: '/wp' },
		{ path: '/zurb' },
		{ path: '/hex' },
		{ path: '/webjars' },
		{ path: '/webpack' },
		{ path: '/emojione/assets' },
		{ path: '/joypixels/assets' },
		{ path: '/jspm' },
		{ path: '/cocoa' },
		{ path: '/musescore' },
	]);

	await db.schema.raw(sql);
};

export const down = () => {};
