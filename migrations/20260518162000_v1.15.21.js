import Bluebird from 'bluebird';

const compressedTables = [
	'view_network_cdns',
	'view_network_countries',
	'view_network_packages',
	'view_top_browser_countries',
	'view_top_browser_platforms',
	'view_top_browser_version_countries',
	'view_top_browser_versions',
	'view_top_browsers',
	'view_top_package_files',
	'view_top_packages',
	'view_top_platform_browsers',
	'view_top_platform_countries',
	'view_top_platform_version_countries',
	'view_top_platform_versions',
	'view_top_platforms',
	'view_top_proxies',
	'view_top_proxy_files',
];

export const up = async (db) => {
	await db.schema.raw(`set global innodb_compression_algorithm = 'lz4'`);

	await Bluebird.map(compressedTables, async (table) => {
		await db.schema.raw(`alter table \`${table}\` row_format = dynamic, page_compressed = 1`);
	}, { concurrency: 4 });
};

export const down = () => {};
