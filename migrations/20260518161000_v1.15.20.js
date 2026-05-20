import Bluebird from 'bluebird';

const compressedTables = [
	'package_listing',
	'package_entrypoints',
	'view_top_packages',
];

export const up = async (db) => {
	await Bluebird.map(compressedTables, async (table) => {
		await db.schema.raw(`alter table \`${table}\` row_format = dynamic, page_compressed = 1`);
	});
};

export const down = () => {};
