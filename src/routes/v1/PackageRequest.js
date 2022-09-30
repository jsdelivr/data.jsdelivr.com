const got = require('got');
const semver = require('semver');
const config = require('config');
const { makeBadge } = require('badge-maker');

const isSemverStatic = require('is-semver-static');
const NumberAbbreviate = require('number-abbreviate');
const number = new NumberAbbreviate([ 'k', 'M', 'B', 'T' ]);

const BaseRequest = require('./BaseRequest');
const BadVersionError = require('../errors/BadVersionError');
const Package = require('../../models/Package');
const PackageListing = require('../../models/PackageListing');
const PackageEntrypoints = require('../../models/PackageEntrypoints');
const PackageVersion = require('../../models/PackageVersion');
const CdnJsPackage = require('../../models/CdnJsPackage');
const dateRange = require('../utils/dateRange');
const sumDeep = require('../utils/sumDeep');
const entrypoint = require('../utils/packageEntrypoint');

const NpmRemoteService = require('../../remote-services/NpmRemoteService');
const GitHubRemoteService = require('../../remote-services/GitHubRemoteService');
const JsDelivrRemoteService = require('../../remote-services/JsDelivrRemoteService');
const RedisRemoteResourceCache = require('../../remote-services/RedisRemoteResourceCache');
const { routes } = require('../v1');

const v1Config = config.get('v1');
const npmRemoteService = new NpmRemoteService({ baseUrl: v1Config.npm.sourceUrl }, new RedisRemoteResourceCache('pr/npm'));
const gitHubRemoteService = new GitHubRemoteService({ auth: `token ${v1Config.gh.apiToken}`, baseUrl: v1Config.gh.sourceUrl }, new RedisRemoteResourceCache('pr/gh'));
const jsDelivrRemoteService = new JsDelivrRemoteService({ baseUrl: v1Config.cdn.sourceUrl }, new RedisRemoteResourceCache('pr/jsd'));

class PackageRequest extends BaseRequest {
	async fetchFiles () {
		let response = await jsDelivrRemoteService.usingContext(this.ctx).listFiles(this.params.type, this.params.name, this.params.version);

		// We require specifying an exact version here. If the final version doesn't match the one from the request,
		// the requested version was actually a range or a tag. Error responses don't return the version field.
		if (response.data.version && response.data.version !== this.params.version) {
			throw new BadVersionError();
		}

		return _.omit(response.data, 'version');
	}

	async fetchMetadata () {
		if (this.params.type === 'npm') {
			return npmRemoteService.usingContext(this.ctx).listVersionsAndTags(this.params.name).then(response => response.data);
		} else if (this.params.type === 'gh') {
			apmClient.addLabels({ githubUser: this.params.user });
			apmClient.addLabels({ githubRepo: this.params.repo });

			return gitHubRemoteService.usingContext(this.ctx).listTags(this.params.user, this.params.repo).then((response) => {
				return { tags: [], versions: response.data };
			}).catch((error) => {
				// istanbul ignore next
				if (error.statusCode === 404) {
					apmClient.addLabels({ githubRepoNotFound: '1' });
				} else if (error.statusCode === 403 && error.headers['x-ratelimit-remaining'] === '0') {
					log.error(`GitHub API rate limit exceeded.`, error);
				}

				throw error;
			});
		}

		throw new Error(`Unknown package type ${this.params.type}.`);
	}

	async getFiles (includeTime = false) {
		let files = JSON.parse(await this.getFilesAsJson());

		if (!files.files) {
			return files;
		} else if (this.query.structure === 'flat') {
			return {
				default: files.default,
				files: files.files.map(({ name, hash, time, size }) => {
					return { name, hash, ...includeTime && { time }, size };
				}),
			};
		}

		let tree = [];
		let dirs = {};
		let fn = (entry, files = tree, dir = '/') => {
			let name = entry.name.substr(1);
			let index = name.indexOf('/');

			if (index !== -1) {
				let dirName = name.substr(0, index);
				let absDirName = dir + '/' + dirName;

				if (!Object.hasOwn(dirs, absDirName)) {
					dirs[absDirName] = { type: 'directory', name: dirName, files: [] };

					// List directories before files.
					let firstFileIndex = files.findIndex(item => item.type === 'file');
					files.splice(firstFileIndex !== -1 ? firstFileIndex : 0, 0, dirs[absDirName]);
				}

				return fn({ name: entry.name.substr(index + 1), hash: entry.hash, time: entry.time, size: entry.size }, dirs[absDirName].files, absDirName);
			}

			files.push({
				type: 'file',
				name,
				hash: entry.hash,
				...includeTime && { time: entry.time },
				size: entry.size,
			});
		};

		files.files.forEach(file => fn(file, tree));
		return { default: files.default, files: tree };
	}

	async getFilesAsJson () {
		let props = { type: this.params.type, name: this.params.name, version: this.params.version };
		let packageListing = await PackageListing.find(props);

		if (packageListing) {
			return packageListing.listing;
		}

		let listing = JSON.stringify(await this.fetchFiles());
		new PackageListing({ ...props, listing }).insert().catch(() => {});
		return listing;
	}

	async getEntrypoints () {
		let props = { type: this.params.type, name: this.params.name, version: this.params.version };
		let packageEntrypoints = await PackageEntrypoints.find(props);

		if (packageEntrypoints) {
			return JSON.parse(packageEntrypoints.entrypoints);
		}

		let response = await jsDelivrRemoteService.usingContext(this.ctx).listResolvedEntries(this.params.type, this.params.name, this.params.version);

		if (response.data.version && response.data.version !== this.params.version) {
			throw new BadVersionError();
		}

		new PackageEntrypoints({ ...props, entrypoints: JSON.stringify(response.data.entrypoints) }).insert().catch(() => {});
		return response.data.entrypoints;
	}

	async getMetadata () {
		return this.fetchMetadata();
	}

	async getResolvedVersion (specifier = 'latest') {
		return this.getMetadata().then((metadata) => {
			let versions = metadata.versions.filter(v => semver.valid(v));

			if (metadata.versions.includes(specifier)) {
				return specifier;
			} else if (Object.hasOwn(metadata.tags, specifier)) {
				return metadata.tags[specifier];
			}

			// "latest" is not actually a range, it's a tag - its equivalent (needed for GitHub sources) is an empty range
			return semver.maxSatisfying(versions, specifier === 'latest' ? '' : specifier);
		});
	}

	async getResolvedEntrypoints () {
		let entrypoints = entrypoint.normalize(await this.getEntrypoints());

		return entrypoint.resolve(entrypoints, [
			() => {
				return entrypoint.fromFields(entrypoints);
			},
			async () => {
				let files = await CdnJsPackage.getPackageEntrypoints(this.params.name, this.params.version);
				return files.map(file => ({ file: file.filename }));
			},
			async () => {
				let files = await PackageVersion.getMostUsedFiles(this.params.name, this.params.version);
				return files.map(file => ({ file: file.filename, guessed: true }));
			},
			() => {
				return entrypoint.fromFallbackFields(entrypoints);
			},
		]);
	}

	async getStatsForPeriod () {
		return Package.getStatsForPeriod(this.params.type, this.params.name, this.period, this.date);
	}

	async handleResolveVersionDeprecated () {
		try {
			this.ctx.body = { version: await this.getResolvedVersion(this.params.version) };
			this.ctx.maxAge = v1Config.maxAgeShort;
			this.ctx.maxStale = v1Config.maxStaleShort;
			this.ctx.maxStaleError = v1Config.maxStaleError;

			if (this.ctx.body.version && isSemverStatic(this.params.version)) {
				this.ctx.maxAge = 24 * 60 * 60;
				this.ctx.maxStale = v1Config.maxStaleStatic;
				this.ctx.maxStaleError = v1Config.maxStaleStatic;
			}
		} catch (e) {
			return this.responseFromRemoteError(e);
		}
	}

	async handleResolvedVersion () {
		try {
			let version = await this.getResolvedVersion(this.query.specifier);

			this.ctx.body = this.linkBuilder()
				.refs(version && {
					self: routes['/packages/:type/:name@:version'].getName(this.params),
					...this.params.type === 'npm' && { entrypoints: routes['/packages/:type/:name@:version/entrypoints'].getName(this.params) },
					stats: routes['/stats/packages/:type/:name@:version'].getName(this.params),
				})
				.withValues(this.params)
				.build({
					type: this.params.type,
					name: this.params.name,
					version,
				});

			this.ctx.maxAge = v1Config.maxAgeShort;
			this.ctx.maxStale = v1Config.maxStaleShort;
			this.ctx.maxStaleError = v1Config.maxStaleError;

			if (this.ctx.body.version && isSemverStatic(this.query.specifier)) {
				this.ctx.maxAge = 24 * 60 * 60;
				this.ctx.maxStale = v1Config.maxStaleStatic;
				this.ctx.maxStaleError = v1Config.maxStaleStatic;
			}
		} catch (e) {
			return this.responseFromRemoteError(e);
		}
	}

	async handleVersionsDeprecated () {
		try {
			this.ctx.body = await this.getMetadata();
			this.ctx.maxAge = v1Config.maxAgeShort;
			this.ctx.maxStale = v1Config.maxStaleShort;
			this.ctx.maxStaleError = v1Config.maxStaleError;
		} catch (e) {
			return this.responseFromRemoteError(e);
		}
	}

	async handlePackage () {
		try {
			let pkg = await this.getMetadata();

			this.ctx.body = this.linkBuilder()
				.refs({
					stats: routes['/stats/packages/:type/:name'].getName(this.params),
				})
				.withValues(this.params)
				.build({
					type: this.params.type,
					name: this.params.name,
					tags: pkg.tags,
					versions: this.linkBuilder()
						.refs({
							self: routes['/packages/:type/:name@:version'].getName(this.params),
							...this.params.type === 'npm' && { entrypoints: routes['/packages/:type/:name@:version/entrypoints'].getName(this.params) },
							stats: routes['/stats/packages/:type/:name@:version'].getName(this.params),
						})
						.withValues(this.params)
						.build(pkg.versions.map(version => ({ version }))),
				});

			this.ctx.maxAge = v1Config.maxAgeShort;
			this.ctx.maxStale = v1Config.maxStaleShort;
			this.ctx.maxStaleError = v1Config.maxStaleError;
		} catch (e) {
			return this.responseFromRemoteError(e);
		}
	}

	async handlePackageEntrypoints (wrapEntries = true) {
		try {
			let entrypoints = await this.getResolvedEntrypoints();
			this.ctx.body = wrapEntries ? { entrypoints } : entrypoints;
			this.ctx.maxAge = v1Config.maxAgeOneWeek;
			this.ctx.maxStale = v1Config.maxStaleOneWeek;
		} catch (remoteResourceOrError) {
			if (remoteResourceOrError instanceof BadVersionError || remoteResourceOrError.statusCode === 404) {
				return this.ctx.body = {
					status: 404,
					message: `Couldn't find version ${this.params.version} for ${this.params.name}. Make sure you use a specific version number, and not a version range or an npm tag.`,
				};
			}

			return this.responseFromRemoteError(remoteResourceOrError);
		}
	}

	async handlePackageBadge () {
		let stats = await this.getStatsForPeriod();
		let bType = _.camelCase(this.query.type);
		let texts = { hits: 'jsDelivr', rank: 'jsDelivr rank', typeRank: `jsDelivr ${this.params.type} rank` };
		let value = 'error';

		if (bType === 'hits') {
			value = `${number.abbreviate(stats.hits.total)} hits${this.period === 'all' ? '' : `/${this.period}`}`;
		} else if ([ 'rank', 'typeRank' ].includes(bType) && stats.hits[bType] !== null) {
			value = `#${stats.hits[bType]}`;
		}

		this.ctx.type = 'image/svg+xml; charset=utf-8';

		this.ctx.body = makeBadge({
			label: texts[bType],
			message: value,
			color: '#ff5627',
			style: this.query.style === 'rounded' ? 'flat' : 'flat-square',
		});

		this.setCacheHeaderDelayed();
	}

	async handlePackageStatsDeprecated () {
		let periodStats = this.getStatsForPeriod();

		if (this.params.groupBy === 'date') {
			let stats = await Package.getSumDateHitsPerVersionByName(this.params.type, this.params.name, ...this.dateRange);

			this.ctx.body = {
				...(await periodStats).hits,
				dates: dateRange.fill(_.mapValues(stats, ({ versions, commits, branches }) => {
					return { total: sumDeep(versions), versions, commits, branches };
				}), ...this.dateRange, { total: 0, versions: {}, commits: {}, branches: {} }),
			};
		} else {
			let stats = await Package.getSumVersionHitsPerDateByName(this.params.type, this.params.name, ...this.dateRange);
			let fn = data => _.mapValues(data, dates => ({ total: sumDeep(dates), dates: dateRange.fill(dates, ...this.dateRange) }));

			this.ctx.body = {
				...(await periodStats).hits,
				versions: fn(stats.versions),
				commits: fn(stats.commits),
				branches: fn(stats.branches),
			};
		}

		this.setCacheHeader();
	}

	async handleVersion () {
		try {
			this.ctx.body = this.linkBuilder()
				.refs({
					stats: routes['/stats/packages/:type/:name@:version'].getName(this.params),
					...this.params.type === 'npm' && { entrypoints: routes['/packages/:type/:name@:version/entrypoints'].getName() },
				})
				.withValues(this.params)
				.build({
					type: this.params.type,
					name: this.params.name,
					version: this.params.version,
					...await this.getFiles(),
				});

			this.ctx.maxAge = v1Config.maxAgeStatic;
			this.ctx.maxStale = v1Config.maxStaleStatic;
		} catch (remoteResourceOrError) {
			return this.responseFromVersionError(remoteResourceOrError);
		}
	}

	async handleVersionFilesDeprecated () {
		try {
			this.ctx.body = await this.getFiles(true); // Can't use AsJson() version here because we need to set correct status code on cached errors.
			this.ctx.maxAge = v1Config.maxAgeStatic;
			this.ctx.maxStale = v1Config.maxStaleStatic;
		} catch (remoteResourceOrError) {
			return this.responseFromVersionError(remoteResourceOrError);
		}
	}

	async handleVersionStatsDeprecated () {
		if (this.params.groupBy === 'date') {
			let stats = await PackageVersion.getSumDateHitsPerFileByName(this.params.type, this.params.name, this.params.version, ...this.dateRange);

			this.ctx.body = {
				total: sumDeep(stats, 2),
				dates: dateRange.fill(_.mapValues(stats, files => ({ total: sumDeep(files), files })), ...this.dateRange, { total: 0, files: {} }),
			};
		} else {
			let stats = await PackageVersion.getSumFileHitsPerDateByName(this.params.type, this.params.name, this.params.version, ...this.dateRange);

			this.ctx.body = {
				total: sumDeep(stats, 2),
				files: _.mapValues(stats, dates => ({ total: sumDeep(dates), dates: dateRange.fill(dates, ...this.dateRange) })),
			};
		}

		this.setCacheHeader();
	}

	responseFromRemoteError (remoteResource) {
		this.ctx.body = {
			status: remoteResource.statusCode === 404
				? 404
				: remoteResource.error instanceof got.TimeoutError || remoteResource.code === 'ETIMEDOUT'
					? 504
					: 502,
			message: this.params.version ? `Couldn't find ${this.params.name}@${this.params.version}.` : `Couldn't fetch versions for ${this.params.name}.`,
		};
	}

	responseFromVersionError (remoteResourceOrError) {
		if (remoteResourceOrError instanceof BadVersionError || remoteResourceOrError.statusCode === 404) {
			return this.ctx.body = {
				status: 404,
				message: `Couldn't find version ${this.params.version} for ${this.params.name}. Make sure you use a specific version number, and not a version range or an npm tag.`,
			};
		}

		if (remoteResourceOrError.error instanceof got.RequestError || remoteResourceOrError.error instanceof got.TimeoutError) {
			return this.ctx.status = remoteResourceOrError.error.code === 'ETIMEDOUT' ? 504 : 502;
		} else if (remoteResourceOrError.statusCode) {
			return this.ctx.body = {
				status: remoteResourceOrError.statusCode || 502,
				message: remoteResourceOrError.data,
			};
		}

		throw remoteResourceOrError;
	}
}

module.exports = PackageRequest;

setTimeout(() => {
	if (apmClient._conf.active) {
		gitHubRemoteService.reportUsage();
	}
}, 10 * 1000);
