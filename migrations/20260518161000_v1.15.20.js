import Bluebird from 'bluebird';

const compressedTables = [
	'package_listing',
	'package_entrypoints',
];

export const up = async (db) => {
	await db.schema.raw(`set global innodb_compression_algorithm = 'lz4'`);

	await Bluebird.map(compressedTables, async (table) => {
		await db.schema.raw(`alter table \`${table}\` row_format = dynamic, page_compressed = 1`);
	}, { concurrency: 4 });
};

export const down = () => {};
