import fs from 'fs';
import routines from './routines.js';

const readLocalFile = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');

export default async (db) => {
	await db.schema.raw(readLocalFile('./events.sql'));
	await db.schema.raw(readLocalFile('./routines.sql'));
	await db.schema.raw(readLocalFile('./routines/browserViews.sql'));
	await db.schema.raw(readLocalFile('./routines/platformViews.sql'));
	await db.schema.raw(readLocalFile('./routines/updateOrInsert.sql'));
	await db.schema.raw(readLocalFile('./views.sql'));
	await routines(db);
};
