const _ = require('lodash');
const crypto = require('crypto');
const Bluebird = require('bluebird');
const relativeDateUtc = require('relative-day-utc');
const { listTables } = require('../../src/lib/db/utils');
const entrypointTestCases = require('../../test/data/v1/entrypoints.json');

const PACKAGE_TYPES = [ 'npm', 'gh' ];
const STATS_START_TIMESTAMP = relativeDateUtc(-70).valueOf();

exports.seed = async (db) => {
	let tablesToClean = _.difference(listTables(db), [
		'knex_migrations',
		'proxy',
	]);

	await Bluebird.each(tablesToClean, async (table) => {
		await db(table).delete();
		await db.schema.raw(`alter table \`${table}\` auto_increment = 0`);
	});

	await db('package').insert(_.flatten(PACKAGE_TYPES.map((type) => {
		return _.range(0, 60).map(i => ({ type, name: (type === 'npm' ? '' : 'user/') + `package-${i}` }));
	})));

	await db('package').insert(_.flatten(PACKAGE_TYPES.map((type) => {
		return { type, name: (type === 'npm' ? '' : 'user/') + `package-60`, isPrivate: 1 };
	})));

	await db('package_version').insert(_.flatten(_.range(1, 121).map((packageId) => {
		return _.range(0, 3).map(i => ({ packageId, version: `1.1.${i}` }));
	})));

	await db('package_version').insert(_.flatten(_.range(120, 121).map((packageId) => {
		return _.range(0, 2).map(i => ({ packageId, version: `branch-${i}`, type: 'branch' }));
	})));

	await db('package_version').insert(_.flatten(_.range(121, 123).map((packageId) => {
		return _.range(0, 3).map(i => ({ packageId, version: `1.1.${i}` }));
	})));

	await db('file').insert(_.flatten(_.range(1, 369).map((packageVersionId) => {
		return _.range(0, 4).map((i) => {
			return {
				packageVersionId,
				filename: `file-${i}.js`,
				sha256: crypto.createHash('sha256').update(`${packageVersionId}-${i}`).digest(),
			};
		});
	})));

	await db('file_hits').insert(_.flatten(_.range(1, 1473).map((fileId) => {
		return _.range(0, 70).map((i) => {
			return {
				fileId,
				date: new Date(STATS_START_TIMESTAMP + (i * 86400000)),
				hits: Math.floor((fileId - 1) / 12) + (fileId > 12 ? i : 0),
				bandwidth: Math.floor((fileId - 1) / 12) * 16 * 1025 + (fileId > 12 ? i : 0),
			};
		});
	})));

	await db('logs').insert(_.flatten(_.range(0, 70).map((i) => {
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
			bandwidth: 1600000,
		};
	})));

	await db('proxy_hits').insert(_.flatten(_.range(1, 16).map((proxyId) => {
		return _.range(0, 70).map((i) => {
			return {
				proxyId,
				date: new Date(STATS_START_TIMESTAMP + (i * 86400000)),
				hits: proxyId * i,
				bandwidth: proxyId * i * 16 * 1025,
			};
		});
	})));

	let seedEntrypointsData = async (entrypointsTestData) => {
		let date = new Date(STATS_START_TIMESTAMP + 40 * 24 * 60 * 60 * 1000);

		for (let [ packageName, data ] of Object.entries(entrypointsTestData)) {
			let [ name, version ] = packageName.split('@');

			if (data.db.entrypoints) {
				await db('package_entrypoints').insert({ type: 'npm', name, version, entrypoints: JSON.stringify(data.db.entrypoints) });
			}

			if (data.db.cdnjs) {
				await db('cdnjs_package').insert({ name, version, filename: data.db.cdnjs });
			}

			if (data.db.stats) {
				let [ packageId ] = await db('package').insert({ name, type: 'npm' });
				let [ versionId ] = await db('package_version').insert({ packageId, version, type: 'version' });

				for (let st of data.db.stats) {
					let [ fileId ] = await db('file').insert({ packageVersionId: versionId, filename: st.file });
					await db('file_hits').insert({ fileId, date, hits: st.hits });
				}
			}
		}
	};

	await seedEntrypointsData(entrypointTestCases);
};

