#!/usr/bin/env node
global._ = require('lodash'); // ¯\_(ツ)_/¯

const path = require('path');
const tar = require('tar-stream');
const config = require('config');
const zlib = require('zlib');
const got = require('got');
const micromatch = require('micromatch');
const Bluebird = require('bluebird');
const pipeline = require('util').promisify(require('stream').pipeline);

const Logger = require('h-logger2');
const ElasticWriter = require('h-logger2-elastic');
const ElasticSearch = require('@elastic/elasticsearch').Client;

const db = require('../src/lib/db/index.js');
const CdnJsPackage = require('../src/models/CdnJsPackage');

const log = (() => {
	let esClient;

	if (process.env.ELASTIC_SEARCH_URL) {
		esClient = new ElasticSearch({
			node: process.env.ELASTIC_SEARCH_URL,
		});
	}

	return new Logger(
		'jsdelivr-cdnjs-sync',
		process.env.NODE_ENV === 'production' ? [
			new Logger.ConsoleWriter(process.env.LOG_LEVEL || Logger.levels.info),
			new ElasticWriter(process.env.LOG_LEVEL || Logger.levels.info, { esClient }),
		] : [
			new Logger.ConsoleWriter(process.env.LOG_LEVEL || Logger.levels.info),
		]
	);
})();

const httpClient = got.extend({
	headers: {
		'user-agent': config.get('server.userAgent'),
	},
	json: true,
	timeout: 30000,
});

const tarballUrl = 'https://github.com/cdnjs/packages/tarball/master';
const versionedListUrl = `https://api.cdnjs.com/libraries/?fields=version,filename&t=${Date.now()}`;

const insertBatch = async (batch) => {
	if (!batch.length) {
		return;
	}

	return db(CdnJsPackage.table).insert(batch).onConflict().merge([ 'filename', 'updatedAt' ]);
};

const fetchExistingPackages = async () => {
	let packages = await db(CdnJsPackage.table).select([ 'name', 'version' ]);

	return new Set(packages.map(p => `${p.name}@${p.version}`));
};

const fetchVersionsList = async () => {
	let response = await httpClient(versionedListUrl);
	let versionsMap = new Map();

	response.body.results.forEach((p) => {
		if (p.name && p.version && p.filename) {
			versionsMap.set(p.name, [ p.version, p.filename ]);
		}
	});

	return versionsMap;
};

const fetchPackages = (versionsMap, existingPackages, resultingPackages) => {
	let extract = tar.extract();

	extract.on('entry', async (header, stream, next) => {
		if (header.type !== 'file') {
			return stream.on('end', next).resume();
		}

		let name = header.name.replace(/\\/g, '/').replace(/^[^/]+\//, '');

		if (!name.startsWith('packages/') || !name.endsWith('.json')) {
			return stream.on('end', next).resume();
		}

		let chunks = [];

		for await (let chunk of stream) {
			chunks.push(chunk);
		}

		let payload = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

		// skip non-npm or packages without default file
		// https://github.com/cdnjs/packages/blob/master/packages/a/ant-design-icons-svg.json
		if (!versionsMap.has(payload.name) || !payload.autoupdate || payload.autoupdate.source !== 'npm' || !payload.filename) {
			return next();
		}

		let [ packageVersion, packageFilename ] = versionsMap.get(payload.name);

		let pkg = {
			name: payload.autoupdate.target,
			version: packageVersion,
			filename: packageFilename,
			fileMap: payload.autoupdate.fileMap,
		};

		// same package version already in the db - skip
		if (existingPackages.has(`${pkg.name}@${pkg.version}`)) {
			return next();
		}

		resultingPackages.push(pkg);

		next();
	});

	extract.on('finish', () => log.info(`${resultingPackages.length} packages ready for update`));

	return extract;
};

function fileExist (filename, files) {
	// cdnjs index may contain dynamically minified files that do not exist in the original package
	// we should allow this scenario because jsdelivr can minify files on the fly
	let normalizedFile = path.posix.join('/', filename);
	let unminifiedFile = normalizedFile.replace(/\.min\.(js|css)$/i, '.$1');

	for (let file of files) {
		if (file.name === normalizedFile || file.name === unminifiedFile) {
			return true;
		}
	}

	return false;
}

async function findWorkingMainFile (pkg) {
	let packageFiles = await httpClient(`${config.get('server.host')}/v1/package/npm/${pkg.name}@${pkg.version}/flat`)
		.then(res => _.get(res, 'body.files', []))
		.catch(() => []);

	if (fileExist(pkg.filename, packageFiles)) {
		return path.posix.join('/', pkg.filename);
	}

	for (let map of pkg.fileMap) {
		for (let pattern of map.files) {
			let normalizedPath = path.posix.join('/', map.basePath, '/', pkg.filename);

			if (micromatch.isMatch(pkg.filename, pattern) && fileExist(normalizedPath, packageFiles)) {
				return normalizedPath;
			}
		}
	}

	return null;
}

const storePackages = async (packages) => {
	let batchSize = 100;
	let batchEntries = [];
	let badPackages = [];
	let progress = 0;

	await Bluebird.map(packages, async (pkg) => {
		let normalizedFile = await findWorkingMainFile(pkg);

		if (!normalizedFile) {
			badPackages.push(pkg);

			return;
		}

		batchEntries.push({ name: pkg.name, version: pkg.version, filename: normalizedFile, updatedAt: new Date() });

		if (batchEntries.length > batchSize) {
			let batch = batchEntries.splice(0, batchSize);
			await insertBatch(batch);

			progress += batch.length;
			log.info(`${progress} packages processed`);
		}
	}, { concurrency: 4 });

	progress += batchEntries.length;
	await insertBatch(batchEntries);

	log.debug(`Bad packages`, { badPackages });
	log.info(`Packages inserted: ${progress}`);
	log.info(`Bad files found: ${badPackages.length}`);
};

let start = Date.now();

Bluebird.all([ fetchVersionsList(), fetchExistingPackages() ])
	.then(([ versionsList, existingPackages ]) => {
		let packages = [];

		return pipeline(
			httpClient.stream(tarballUrl),
			zlib.createGunzip(),
			fetchPackages(versionsList, existingPackages, packages)
		).then(() => storePackages(packages));
	})
	.finally(() => {
		log.info(`Execution time: ${Date.now() - start} ms`);
		setTimeout(() => process.exit(), 2000);
	})
	.catch(err => log.error(`Error during sync`, err));

