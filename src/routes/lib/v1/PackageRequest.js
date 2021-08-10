const got = require('got');
const semver = require('semver');
const config = require('config');
const BadgeFactory = require('gh-badges').BadgeFactory;
const isSemverStatic = require('is-semver-static');
const NumberAbbreviate = require('number-abbreviate');
const number = new NumberAbbreviate([ 'k', 'M', 'B', 'T' ]);
const badgeFactory = new BadgeFactory();

const BaseRequest = require('./BaseRequest');
const BadVersionError = require('../errors/BadVersionError');
const Package = require('../../../models/Package');
const PackageListing = require('../../../models/PackageListing');
const PackageEntrypoints = require('../../../models/PackageEntrypoints');
const PackageVersion = require('../../../models/PackageVersion');
const CdnJsPackage = require('../../../models/CdnJsPackage');
const dateRange = require('../../utils/dateRange');
const sumDeep = require('../../utils/sumDeep');
const entrypoint = require('../../utils/packageEntrypoint');

const NpmRemoteService = require('../../../remote-services/NpmRemoteService');
const GitHubRemoteService = require('../../../remote-services/GitHubRemoteService');
const JsDelivrRemoteService = require('../../../remote-services/JsDelivrRemoteService');
const RedisRemoteResourceCache = require('../../../remote-services/RedisRemoteResourceCache');

const v1Config = config.get('v1');
const npmRemoteService = new NpmRemoteService({ baseUrl: v1Config.npm.sourceUrl }, new RedisRemoteResourceCache('pr/npm'));
const gitHubRemoteService = new GitHubRemoteService({ auth: `token ${v1Config.gh.apiToken}`, baseUrl: v1Config.gh.sourceUrl }, new RedisRemoteResourceCache('pr/gh'));
const jsDelivrRemoteService = new JsDelivrRemoteService({ baseUrl: v1Config.cdn.sourceUrl }, new RedisRemoteResourceCache('pr/jsd'));

class PackageRequest extends BaseRequest {
	constructor (ctx) {
		super(ctx);

		this.keys = {
			metadata: `c:package/${this.params.type}/${this.params.name}/metadata`,
			rank: `package/${this.params.type}/${this.params.name}/rank/`,
		};
	}

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

	async getFiles () {
		let files = JSON.parse(await this.getFilesAsJson());

		if (this.params.structure === 'flat' || !files.files) {
			return files;
		}

		let tree = [];
		let dirs = {};
		let fn = (entry, files = tree, dir = '/') => {
			let name = entry.name.substr(1);
			let index = name.indexOf('/');

			if (index !== -1) {
				let dirName = name.substr(0, index);
				let absDirName = dir + '/' + dirName;

				if (!{}.hasOwnProperty.call(dirs, absDirName)) {
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
				time: entry.time,
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

		if (response.data.entrypoints) {
			new PackageEntrypoints({ ...props, entrypoints: JSON.stringify(response.data.entrypoints) }).insert().catch(() => {});
		}

		return response.data.entrypoints || [];
	}

	async getMetadata () {
		return this.fetchMetadata();
	}

	async getRank () {
		let stats = await Package.getStatsForPeriod(this.params.type, this.params.name, this.period, this.date);
		return stats ? stats.rank : null;
	}

	async getResolvedVersion () {
		return this.getMetadata().then((metadata) => {
			let requestedVersion = this.params.version || 'latest';
			let versions = metadata.versions.filter(v => semver.valid(v));

			if (metadata.versions.includes(requestedVersion)) {
				return requestedVersion;
			} else if ({}.hasOwnProperty.call(metadata.tags, requestedVersion)) {
				return metadata.tags[requestedVersion];
			}

			// "latest" is not actually a range, it's a tag - its equivalent (needed for GitHub sources) is an empty range
			return semver.maxSatisfying(versions, requestedVersion === 'latest' ? '' : requestedVersion);
		});
	}

	async getResolvedEntrypoints () {
		let browserSafeColumns = [ 'jsdelivr', 'cdn', 'browser', 'style' ];
		let entrypoints = await this.getEntrypoints();

		let defaultFiles = entrypoint.resolveEntrypoints({}, entrypoints);

		// use "safe entry"
		let safeEntries = entrypoints.filter(e => browserSafeColumns.includes(e.field));

		if (safeEntries.length > 0) {
			defaultFiles = entrypoint.resolveEntrypoints(defaultFiles, safeEntries, 'safe');
		}

		// We are ready to respond when both js and style exist and resolved from trusted sources
		if (entrypoint.readyForResponse(defaultFiles)) {
			return entrypoint.buildResponse(defaultFiles);
		}

		// or get from cdnJs index
		let cdnjsFile = await CdnJsPackage.getPackageEntrypoint(this.params.name, this.params.version);

		if (cdnjsFile) {
			defaultFiles = entrypoint.resolveEntrypoints(defaultFiles, [{ file: cdnjsFile }], 'cdnjs');
		}

		if (entrypoint.readyForResponse(defaultFiles)) {
			return entrypoint.buildResponse(defaultFiles);
		}

		// or detect most used file
		let mostUsed = await PackageVersion.getMostUsedFiles(this.params.name, this.params.version);

		if (mostUsed.length > 0) {
			defaultFiles = entrypoint.resolveEntrypoints(defaultFiles, mostUsed.map(row => ({ file: row.filename })), 'stats');
		}

		return entrypoint.buildResponse(defaultFiles);
	}

	async handleResolveVersion () {
		try {
			this.ctx.body = { version: await this.getResolvedVersion() };
			this.ctx.maxAge = v1Config.maxAgeShort;
			this.ctx.maxStale = v1Config.maxStaleShort;
			this.ctx.maxStaleError = v1Config.maxStaleErrorShort;

			if (this.ctx.body.version && isSemverStatic(this.params.version)) {
				this.ctx.maxAge = 24 * 60 * 60;
				this.ctx.maxStale = v1Config.maxStaleStatic;
				this.ctx.maxStaleError = v1Config.maxStaleStatic;
			}
		} catch (e) {
			return this.responseFromRemoteError(e);
		}
	}

	async handleVersions () {
		try {
			this.ctx.body = await this.getMetadata();
			this.ctx.maxAge = v1Config.maxAgeShort;
			this.ctx.maxStale = v1Config.maxStaleShort;
			this.ctx.maxStaleError = v1Config.maxStaleErrorShort;
		} catch (e) {
			return this.responseFromRemoteError(e);
		}
	}

	async handleResolveEntrypoints () {
		try {
			this.ctx.body = await this.getResolvedEntrypoints();
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
		let stats = await Package.getStatsForPeriod(this.params.type, this.params.name, this.period, this.date);
		let hits = stats ? stats.hits : 0;

		this.ctx.type = 'image/svg+xml; charset=utf-8';

		this.ctx.body = badgeFactory.create({
			text: [ 'jsDelivr', `${number.abbreviate(hits)} hits${this.period === 'all' ? '' : `/${this.period}`}` ],
			colorB: '#ff5627',
			template: this.ctx.query.style === 'rounded' ? 'flat' : 'flat-square',
		});

		this.setCacheHeaderDelayed();
	}

	async handlePackageBadgeRank () {
		let rank = await this.getRank();
		let text = 'error';

		if (rank !== null) {
			text = `#${rank}`;
		}

		this.ctx.type = 'image/svg+xml; charset=utf-8';

		this.ctx.body = badgeFactory.create({
			text: [ 'jsDelivr rank', text ],
			colorB: '#ff5627',
			template: this.ctx.query.style === 'rounded' ? 'flat' : 'flat-square',
		});

		this.setCacheHeaderDelayed();
	}

	async handlePackageStats () {
		if (this.params.groupBy === 'date') {
			let data = await Package.getSumDateHitsPerVersionByName(this.params.type, this.params.name, ...this.dateRange);
			let total = sumDeep(data, 3);

			this.ctx.body = {
				rank: total ? await this.getRank() : null,
				total,
				dates: dateRange.fill(_.mapValues(data, ({ versions, commits, branches }) => ({ total: sumDeep(versions), versions, commits, branches })), ...this.dateRange, { total: 0, versions: {}, commits: {}, branches: {} }),
			};
		} else {
			let data = await Package.getSumVersionHitsPerDateByName(this.params.type, this.params.name, ...this.dateRange);
			let total = sumDeep(data, 3);
			let fn = data => _.mapValues(data, dates => ({ total: sumDeep(dates), dates: dateRange.fill(dates, ...this.dateRange) }));

			this.ctx.body = {
				rank: total ? await this.getRank() : null,
				total,
				versions: fn(data.versions),
				commits: fn(data.commits),
				branches: fn(data.branches),
			};
		}

		this.setCacheHeader();
	}

	async handleVersionFiles () {
		try {
			this.ctx.body = await this.getFiles(); // Can't use AsJson() version here because we need to set correct status code on cached errors.
			this.ctx.maxAge = v1Config.maxAgeStatic;
			this.ctx.maxStale = v1Config.maxStaleStatic;
		} catch (remoteResourceOrError) {
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

	async handleVersionStats () {
		if (this.params.groupBy === 'date') {
			let data = await PackageVersion.getSumDateHitsPerFileByName(this.params.type, this.params.name, this.params.version, ...this.dateRange);

			this.ctx.body = {
				total: sumDeep(data, 2),
				dates: dateRange.fill(_.mapValues(data, files => ({ total: sumDeep(files), files })), ...this.dateRange, { total: 0, files: {} }),
			};
		} else {
			let data = await PackageVersion.getSumFileHitsPerDateByName(this.params.type, this.params.name, this.params.version, ...this.dateRange);

			this.ctx.body = {
				total: sumDeep(data, 2),
				files: _.mapValues(data, dates => ({ total: sumDeep(dates), dates: dateRange.fill(dates, ...this.dateRange) })),
			};
		}

		this.setCacheHeader();
	}

	async responseFromRemoteError (remoteResource) {
		this.ctx.body = {
			status: remoteResource.statusCode === 404
				? 404
				: remoteResource.error instanceof got.TimeoutError || remoteResource.code === 'ETIMEDOUT'
					? 504
					: 502,
			message: this.params.version ? `Couldn't find ${this.params.name}@${this.params.version}.` : `Couldn't fetch versions for ${this.params.name}.`,
		};
	}
}

module.exports = PackageRequest;

setTimeout(() => {
	if (apmClient._conf.active) {
		gitHubRemoteService.reportUsage();
	}
}, 10 * 1000);
