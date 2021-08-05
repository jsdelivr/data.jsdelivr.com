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

const db = require('../src/lib/db/index.js');
const CndJsPackage = require('../src/models/CdnJsPackage');

const httpClient = got.extend({ headers: { 'user-agent': config.get('server.userAgent') }, json: true });

const tarballUrl = 'https://github.com/cdnjs/packages/tarball/master';
const versionedListUrl = 'https://api.cdnjs.com/libraries/?fields=version';

const fetchExistingPackages = async () => {
	let packages = await db(CndJsPackage.table).select([ 'name', 'version' ]);

	return new Set(packages.map(p => `${p.name}@${p.version}`));
};

const insertBatch = async (batch) => {
	if (!batch.length) {
		return;
	}

	return db(CndJsPackage.table).insert(batch).onConflict().ignore();
};

const fetchVersionsList = async () => {
	let response = await httpClient(versionedListUrl);
	return new Map(response.body.results.map(p => [ p.name, p.version ]));
};

function getBasePath (config) {
	for (let map of config.autoupdate.fileMap) {
		for (let pattern of map.files) {
			if (micromatch.isMatch(config.filename, pattern)) {
				return map.basePath;
			}
		}
	}

	return '';
}

async function fileExist (name, version, filename) {
	let files = await httpClient(`${config.get('server.url')}/v1/package/npm/${name}@${version}/flat`)
		.then(res => _.get(res, 'body.files', []))
		.catch(() => []);

	// cdnjs index may contain dynamically minimized files that are not exist in the original package
	// we should allow this scenario because jsdelivr can minify files on th fly
	let normalizedFilename = filename.replace(/\.min\.(js|css)$/i, '.$1'); // convert to unminified

	for (let file of files) {
		if (file.name === filename || file.name === normalizedFilename) {
			return true;
		}
	}

	return false;
}

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

		let basePath = '/' + getBasePath(payload);
		let pkg = {
			name: payload.autoupdate.target,
			version: versionsMap.get(payload.name),
			filename: path.posix.join(basePath, payload.filename),
		};

		// same package version already in the db - skip
		if (existingPackages.has(`${pkg.name}@${pkg.version}`)) {
			return next();
		}

		resultingPackages.push(pkg);

		next();
	});

	extract.on('finish', () => console.log(`${resultingPackages.length} packages ready for update`));

	return extract;
};

const insertPackages = async (packages) => {
	let batchSize = 100;
	let batchEntries = [];
	let badPackages = [];
	let progress = 0;

	await Bluebird.map(packages, async (pkg) => {
		// file recommended by cdnjs doesn't exist in the package - skip
		if (!await fileExist(pkg.name, pkg.version, pkg.filename)) {
			badPackages.push(pkg);

			return;
		}

		batchEntries.push(pkg);

		if (batchEntries.length > batchSize) {
			let batch = batchEntries.splice(0, batchSize);
			await insertBatch(batch);

			progress += batch.length;
			console.log(`${progress} packages processed`);
		}
	}, { concurrency: 4 });

	await insertBatch(batchEntries);

	console.log(`packages inserted: ${progress}`);
	console.log(`bad files found: ${badPackages.length}`);
	// badFiles.forEach(file => console.log(`File ${file.filename} do not exist for ${file.packageName}@${file.packageVersion}`));
};

console.time('cdnjs import');

// eslint-disable-next-line promise/catch-or-return
Bluebird.all([ fetchVersionsList(), fetchExistingPackages() ])
	.then(([ versionsList, existingPackages ]) => {
		let packages = [];

		return pipeline(
			httpClient.stream(tarballUrl),
			zlib.createGunzip(),
			fetchPackages(versionsList, existingPackages, packages)
		).then(() => insertPackages(packages));
	})
	.catch(err => console.error(err))
	.then(() => {
		console.timeEnd('cdnjs import');
		db.destroy(() => console.log('DB connection closed'));
	});
