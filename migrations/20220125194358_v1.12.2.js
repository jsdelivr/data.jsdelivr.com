const Bluebird = require('bluebird');
const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await Bluebird.mapSeries([
		'country_cdn_hits',
		'file_hits',
		'other_hits',
		'package_hits',
		'package_version_hits',
		'proxy_hits',
		'referrer_hits',
		'view_network_packages',
		'view_top_packages_all',
		'view_top_packages_day',
		'view_top_packages_month',
		'view_top_packages_week',
		'view_top_packages_year',
	], async (table) => {
		await db.schema.raw(`update \`${table}\` set bandwidth = bandwidth * 1024 * 1024`);
		await db.schema.raw(`alter table ${table} modify column bandwidth bigint unsigned default 0 not null`);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
