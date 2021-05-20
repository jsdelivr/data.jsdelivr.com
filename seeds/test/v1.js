const _ = require('lodash');
const crypto = require('crypto');
const Bluebird = require('bluebird');
const relativeDateUtc = require('relative-day-utc');
const { listTables } = require('../../src/lib/db/utils');

const PACKAGE_TYPES = [ 'npm', 'gh' ];
const STATS_START_TIMESTAMP = relativeDateUtc(-60).valueOf();

exports.seed = async (db) => {
	await Bluebird.each(listTables(db), async (table) => {
		await db(table).delete();
		await db.schema.raw(`alter table \`${table}\` auto_increment = 0`);
	});

	await db('package').insert(_.flatten(PACKAGE_TYPES.map((type) => {
		return _.range(0, 60).map(i => ({ type, name: (type === 'npm' ? '' : 'user/') + `package-${i}` }));
	})));

	await db('package_version').insert(_.flatten(_.range(1, 121).map((packageId) => {
		return _.range(0, 3).map(i => ({ packageId, version: `1.1.${i}` }));
	})));

	await db('package_version').insert(_.flatten(_.range(120, 121).map((packageId) => {
		return _.range(0, 2).map(i => ({ packageId, version: `branch-${i}`, type: 'branch' }));
	})));

	await db('file').insert(_.flatten(_.range(1, 363).map((packageVersionId) => {
		return _.range(0, 4).map((i) => {
			return {
				packageVersionId,
				filename: `file-${i}.js`,
				sha256: crypto.createHash('sha256').update(`${packageVersionId}-${i}`).digest(),
			};
		});
	})));

	await db('file_hits').insert(_.flatten(_.range(1, 1449).map((fileId) => {
		return _.range(0, 60).map((i) => {
			return {
				fileId,
				date: new Date(STATS_START_TIMESTAMP + (i * 86400000)),
				hits: Math.floor((fileId - 1) / 12),
			};
		});
	})));

	await db('logs').insert(_.flatten(_.range(0, 60).map((i) => {
		return {
			date: new Date(STATS_START_TIMESTAMP + (i * 86400000)),
			records: 1000000000,
			megabytesLogs: 10000,
			megabytesTraffic: 100000,
		};
	})));

	await db('other_hits').insert(_.flatten(_.range(0, 2).map((i) => {
		return {
			date: new Date(STATS_START_TIMESTAMP + (i * 86400000)),
			hits: 100000,
		};
	})));
};

