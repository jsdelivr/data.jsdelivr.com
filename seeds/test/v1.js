const _ = require('lodash');
const crypto = require('crypto');
const Bluebird = require('bluebird');
const { listTables } = require('../../src/lib/db/utils');

const PACKAGE_TYPES = [ 'gh', 'npm' ];
const STATS_START_DATE = [ 2017, 4, 29 ];

exports.seed = async (db) => {
	await Bluebird.each(listTables(db), async (table) => {
		await db(table).delete();
		await db.schema.raw(`alter table \`${table}\` auto_increment = 0`);
	});

	await db('package').insert(_.flatten(PACKAGE_TYPES.map((type) => {
		return _.range(0, 60).map(i => ({ type, name: `package-${i}` }));
	})));

	await db('package_version').insert(_.flatten(_.range(1, 121).map((packageId) => {
		return _.range(0, 3).map(i => ({ packageId, version: `1.1.${i}` }));
	})));

	await db('file').insert(_.flatten(_.range(1, 361).map((packageVersionId) => {
		return _.range(0, 4).map((i) => {
			return {
				packageVersionId,
				filename: `file-${i}.js`,
				sha256: crypto.createHash('sha256').update(`${packageVersionId}-${i}`).digest(),
			};
		});
	})));

	await db('file_hits').insert(_.flatten(_.range(1, 1441).map((fileId) => {
		return _.range(0, 60).map((i) => {
			return {
				fileId,
				date: new Date(Date.UTC(...STATS_START_DATE) + (i * 86400000)),
				hits: 100,
			};
		});
	})));

	await db('file_hits')
		.update({ hits: 1000 })
		.where({ fileId: 840 })
		.whereIn('date', [ '2017-07-24', '2017-07-27' ]);

	await db('logs').insert(_.flatten(_.range(0, 60).map((i) => {
		return {
			date: new Date(Date.UTC(...STATS_START_DATE) + (i * 86400000)),
			records: 1000000000,
			megabytesLogs: 10000,
			megabytesTraffic: 100000,
		};
	})));

	await db('other_hits').insert(_.flatten(_.range(0, 2).map((i) => {
		return {
			date: new Date(Date.UTC(2017, 6, 25) + (i * 86400000)),
			hits: 100000,
		};
	})));
};

