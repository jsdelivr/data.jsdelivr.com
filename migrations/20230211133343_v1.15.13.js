import Bluebird from 'bluebird';
import updateSharedObjects from './shared/updateSharedObjects.js';

export const up = async (db) => {
	await Bluebird.mapSeries([
		'view_top_packages_all',
		'view_top_packages_day',
		'view_top_packages_month',
		'view_top_packages_week',
		'view_top_packages_year',
	], async (name) => {
		await db.schema.raw(`drop table if exists \`${name}\``);
	});

	await Bluebird.mapSeries([
		'updateViewTopPackagesAll',
		'updateViewTopPackagesDay',
		'updateViewTopPackagesMonth',
		'updateViewTopPackagesWeek',
		'updateViewTopPackagesYear',
	], async (name) => {
		await db.schema.raw(`drop procedure if exists \`${name}\``);
	});

	await Bluebird.mapSeries([
		'top_packages_update',
	], async (name) => {
		await db.schema.raw(`drop event if exists \`${name}\``);
	});

	await updateSharedObjects(db);
};

export const down = () => {};
