const _ = require('lodash');
const crypto = require('crypto');
const Bluebird = require('bluebird');
const relativeDateUtc = require('relative-day-utc');
const { listTables } = require('../../src/lib/db/utils');
const dateRange = require('../../src/routes/utils/dateRange');
const entrypointTestCases = require('../../test/data/v1/entrypoints.json');
const countries = Object.keys(require('countries-list').countries);
const providers = [ 'CF', 'FY', 'GC', 'QT' ];

const PACKAGE_TYPES = [ 'npm', 'gh' ];
const STATIC_MONTHS = [ '2020-02-01', '2020-03-01', '2020-04-01' ];
const FLOATING_MONTHS = [
	dateRange.parseStaticPeriod('s-month').date,
	dateRange.parseStaticPeriod('s-year').date,
];
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
		return _.range(0, 60).map(i => ({ type, name: (type === 'npm' ? i % 2 ? '@scope/' : '' : 'user/') + `package-${i}` }));
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
				hits: fileId > 12 ? Math.floor((fileId - 1) / 4) + i : 0,
				bandwidth: fileId > 12 ? Math.floor((fileId - 1) / 4) * 16 * 1025 + i : 0,
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

	await db('proxy_file').insert(_.flatten(_.range(1, 16).map((proxyId) => {
		return _.range(1, 111).map((i) => {
			return {
				id: (proxyId - 1) * 110 + i,
				proxyId,
				filename: `/file-${(proxyId - 1) * 110 + i}`,
			};
		});
	})));

	await db('proxy_file_hits').insert(_.flatten(_.range(1, 16).map((proxyId) => {
		return _.flatten(_.range(1, 111).map((fi) => {
			return _.range(0, 70).map((i) => {
				return {
					proxyFileId: (proxyId - 1) * 110 + fi,
					date: new Date(STATS_START_TIMESTAMP + (i * 86400000)),
					hits: proxyId * Math.floor(fi / 2) * i,
					bandwidth: proxyId * Math.floor(fi / 2) * i * 16 * 1025,
				};
			});
		}));
	})));

	await db('country_cdn_hits').insert(_.flatten(countries.map((countryIso, index) => {
		return _.flatten(providers.map((cdn) => {
			return _.range(cdn === 'GC' ? 60 : 0, cdn === 'QT' ? 62 : 70).map((i) => {
				return {
					countryIso,
					cdn,
					date: new Date(STATS_START_TIMESTAMP + (i * 86400000)),
					hits: index * i,
					bandwidth: index * i * 16 * 1025,
				};
			});
		}));
	})));

	await db('browser').insert(_.range(0, 20).map(i => ({ name: `browser ${i}` })));

	await db('browser_version').insert(_.flatten(_.range(1, 21).map((browserId) => {
		return _.range(0, 3).map(i => ({ browserId, version: i }));
	})));

	await db('platform').insert(_.range(0, 20).map(i => ({ name: `platform ${i}` })));

	await db('platform_version').insert(_.flatten(_.range(1, 21).map((platformId) => {
		return _.range(0, 3).map(i => ({ platformId, version: i, versionName: i === 2 ? `version ${i}` : null }));
	})));

	await db('country_browser_version_hits').insert(_.flatten(countries.map((countryIso, countryIndex) => {
		return _.flatten(_.range(1, 61).map((browserVersionId) => {
			return _.flatten(STATIC_MONTHS.slice(0, browserVersionId < 23 ? -1 : undefined).map((month, mIndex) => {
				let platformIndex = Math.floor((browserVersionId - 1) / 6);
				let platformVersionIndex = Math.floor((browserVersionId - 1) / 2);

				return [
					{
						browserVersionId,
						platformId: platformIndex + 1,
						countryIso,
						date: new Date(month),
						hits: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
					{
						browserVersionId,
						platformId: 10 + platformIndex + 1,
						countryIso,
						date: new Date(month),
						hits: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
				];
			}));
		}));
	})).concat(_.flatten(countries.slice(0, 10).map((countryIso, countryIndex) => {
		return _.flatten(_.range(1, 21).map((browserVersionId) => {
			return _.flatten(FLOATING_MONTHS.map((month, mIndex) => {
				let platformIndex = Math.floor((browserVersionId - 1) / 6);
				let platformVersionIndex = Math.floor((browserVersionId - 1) / 2);

				return [
					{
						browserVersionId,
						platformId: platformIndex + 1,
						countryIso,
						date: new Date(month),
						hits: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
					{
						browserVersionId,
						platformId: 10 + platformIndex + 1,
						countryIso,
						date: new Date(month),
						hits: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
				];
			}));
		}));
	}))));

	await db('country_platform_version_hits').insert(_.flatten(countries.map((countryIso, countryIndex) => {
		return _.flatten(_.range(1, 31).map((platformVersionId, platformVersionIndex) => {
			return _.flatten(STATIC_MONTHS.slice(0, platformVersionId < 12 ? -1 : undefined).map((month, mIndex) => {
				return [
					{
						platformVersionId,
						countryIso,
						date: new Date(month),
						hits: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
					{
						platformVersionId: 30 + platformVersionId,
						countryIso,
						date: new Date(month),
						hits: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
				];
			}));
		}));
	})).concat(_.flatten(countries.slice(0, 10).map((countryIso, countryIndex) => {
		return _.flatten(_.range(1, 11).map((platformVersionId, platformVersionIndex) => {
			return _.flatten(FLOATING_MONTHS.map((month, mIndex) => {
				return [
					{
						platformVersionId,
						countryIso,
						date: new Date(month),
						hits: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
					{
						platformVersionId: 30 + platformVersionId,
						countryIso,
						date: new Date(month),
						hits: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1),
						bandwidth: 2 * countryIndex * platformVersionIndex * ((mIndex % 2 || platformVersionIndex) + 1) * 16 * 1025,
					},
				];
			}));
		}));
	}))));

	let seedEntrypointsData = async (entrypointsTestData) => {
		let date = new Date(STATS_START_TIMESTAMP + 40 * 24 * 60 * 60 * 1000);

		for (let [ packageName, data ] of Object.entries(entrypointsTestData)) {
			let parts = packageName.split('@');
			let name = parts.slice(0, -1).join('@');
			let version = parts.at(-1);

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

