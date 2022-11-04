const Bluebird = require('bluebird');
const updateSharedObjects = require('./shared/updateSharedObjects');
const staticPeriods = [ 's-day', 's-week', 's-month', 's-quarter', 's-year' ];
const periods = [ 'day', 'week', 'month', 'quarter', 'year', 'all', ...staticPeriods ];

exports.up = async (db) => {
	await Bluebird.mapSeries([
		'view_top_browser_countries',
		'view_top_browser_platforms',
		'view_top_browser_version_countries',
		'view_top_browser_versions',
		'view_top_browsers',
		'view_top_platform_browsers',
		'view_top_platform_countries',
		'view_top_platform_version_countries',
		'view_top_platform_versions',
		'view_top_platforms',
	], async (table) => {
		await db.schema.alterTable(table, (table) => {
			table.enum('period', staticPeriods).alter();
		});
	});

	await Bluebird.mapSeries([
		'view_network_cdns',
		'view_network_countries',
		'view_top_packages',
		'view_top_proxies',
		'view_top_proxy_files',
	], async (table) => {
		await db.schema.alterTable(table, (table) => {
			table.enum('period', periods).alter();
		});
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
