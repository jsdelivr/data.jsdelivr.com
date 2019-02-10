const got = require('got');
const semver = require('semver');
const config = require('config');
const GitHubApi = require('@octokit/rest');
const BadgeFactory = require('gh-badges').BadgeFactory;
const isSha = require('is-hexdigest');
const isSemverStatic = require('is-semver-static');
const vCompare = require('v-compare');
const NumberAbbreviate = require('number-abbreviate');
const number = new NumberAbbreviate([ 'k', 'M', 'B', 'T' ]);
const PromiseCache = require('../../../lib/promise-cache');
const fetchCache = new PromiseCache({ maxAge: 60 * 1000 }).autoClear();
const badgeFactory = new BadgeFactory();

const BaseRequest = require('./BaseRequest');
const Package = require('../../../models/Package');
const PackageVersion = require('../../../models/PackageVersion');
const dateRange = require('../../utils/dateRange');
const sumDeep = require('../../utils/sumDeep');

const v1Config = config.get('v1');
const githubApi = new GitHubApi({
	auth: `token ${v1Config.gh.apiToken}`,
	baseUrl: v1Config.gh.sourceUrl,
	userAgent: 'jsDelivr API backend',
	request: {
		timeout: 30000,
	},
});

class PackageRequest extends BaseRequest {
	constructor (ctx) {
		super(ctx);

		this.keys = {
			files: `c:package/${this.params.type}/${this.params.name}@${this.params.version}/files`,
			metadata: `c:package/${this.params.type}/${this.params.name}/metadata`,
			rank: `package/${this.params.type}/${this.params.name}/rank`,
		};
	}

	async fetchFiles () {
		let url = `${v1Config.cdn.sourceUrl}/${this.params.type}/${this.params.name}@${encodeURIComponent(this.params.version)}/+private-json`;

		return fetchCache.get(url, () => {
			return got(url, { json: true, timeout: 30000 }).then((response) => {
				return _.pick(response.body, [ 'default', 'files' ]);
			}).catch((error) => {
				if (error instanceof got.HTTPError && error.response.statusCode === 403) {
					return {
						status: error.response.statusCode,
						message: error.response.body,
					};
				}

				throw error;
			});
		});
	}

	async fetchMetadata () {
		if (this.params.type === 'npm') {
			return fetchNpmMetadata(this.params.name);
		} else if (this.params.type === 'gh') {
			return fetchGitHubMetadata(this.params.user, this.params.repo);
		}

		throw new Error(`Unknown package type ${this.params.type}.`);
	}

	async getFiles () {
		let files = JSON.parse(await this.getFilesAsJson());

		if (this.ctx.params.structure === 'flat' || !files.files) {
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

				if (!dirs.hasOwnProperty(absDirName)) {
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
		let files = await redis.getCompressedAsync(this.keys.files);

		if (files) {
			return files;
		}

		files = JSON.stringify(await this.fetchFiles(), null, '\t');
		await redis.setCompressedAsync(this.keys.files, files);
		return files;
	}

	async getMetadata () {
		return JSON.parse(await this.getMetadataAsJson());
	}

	async getMetadataAsJson () {
		let metadata = await redis.getCompressedAsync(this.keys.metadata);

		if (metadata) {
			return metadata;
		}

		metadata = JSON.stringify(await this.fetchMetadata(), null, '\t');
		await redis.setCompressedAsync(this.keys.metadata, metadata, 'EX', v1Config[this.params.type].maxAge);
		return metadata;
	}

	async getRank () {
		let date = `/${this.dateRange[0].toISOString().substr(0, 10)}/${this.dateRange[1].toISOString().substr(0, 10)}`;
		let rank = await redis.getAsync(this.keys.rank + date);

		if (rank) {
			return Number(rank);
		}

		rank = -1;
		let hits = Infinity;

		await Promise.map(Package.getTopPackages(...this.dateRange, null), (pkg) => {
			if (pkg.hits < hits) {
				hits = pkg.hits;
				rank++;
			}

			return redis.setAsync(`package/${pkg.type}/${pkg.name}/rank${date}`, rank, 'EX', 86400 - Math.floor(Date.now() % 86400000 / 1000));
		});

		rank = await redis.getAsync(this.keys.rank + date);
		return rank ? Number(rank) : null;
	}

	async getResolvedVersion () {
		return this.getMetadata().then((metadata) => {
			let versions = metadata.versions.filter(v => semver.valid(v) && !semver.prerelease(v)).sort(semver.rcompare);

			if (metadata.versions.includes(this.params.version)) {
				return this.params.version;
			} else if (metadata.tags.hasOwnProperty(this.params.version)) {
				return metadata.tags[this.params.version];
			} else if (this.params.version === 'latest' || !this.params.version) {
				return versions[0];
			}

			return semver.maxSatisfying(versions, this.params.version);
		});
	}

	async handleResolveVersion () {
		try {
			this.ctx.body = { version: await this.getResolvedVersion() };

			if (this.ctx.body.version && isSemverStatic(this.params.version)) {
				this.ctx.maxAge = 24 * 60 * 60;
				this.ctx.maxStale = v1Config.maxStale;
			}
		} catch (e) {
			return this.responseNotFound();
		}
	}

	async handleVersions () {
		try {
			this.ctx.body = await this.getMetadataAsJson();
		} catch (e) {
			return this.responseNotFound();
		}
	}

	async handlePackageBadge () {
		let hits = await Package.getSumHits(this.params.type, this.params.name, ...this.dateRange);

		this.ctx.type = 'image/svg+xml; charset=utf-8';
		this.ctx.body = badgeFactory.create({
			text: [ ' jsDelivr ', ` ${number.abbreviate(hits)} hits/${this.params.period || 'month'} ` ],
			colorB: '#ff5627',
			template: this.ctx.query.style === 'rounded' ? 'flat' : 'flat-square',
		}).replace(/textLength="[^"]*?"/g, '');

		this.setCacheHeaderDelayed();
	}

	async handlePackageStats () {
		if (this.params.groupBy === 'date') {
			let data = await Package.getSumDateHitsPerVersionByName(this.params.type, this.params.name, ...this.dateRange);
			let total = sumDeep(data, 3);

			this.ctx.body = {
				rank: total ? await this.getRank() : null,
				total,
				dates: dateRange.fill(_.mapValues(data, ({ versions, commits }) => ({ total: sumDeep(versions), versions, commits })), ...this.dateRange, { total: 0, versions: {}, commits: {} }),
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
			};
		}

		this.setCacheHeader();
	}

	async handleVersionFiles () {
		// Don't validate version if it's a commit hash.
		if (this.params.type !== 'gh' || !isSha(this.params.version, 'sha1')) {
			let metadata;

			try {
				metadata = await this.getMetadata();
			} catch (e) {
				return this.responseNotFound();
			}

			if (!metadata.versions.includes(this.params.version)) {
				return this.ctx.body = {
					status: 404,
					message: `Couldn't find version ${this.params.version} for ${this.params.name}. Make sure you use a specific version number, and not a version range or a tag.`,
				};
			}
		}

		try {
			this.ctx.body = await this.getFiles(); // Can't use AsJson() version here because we need to set correct status code on cached errors.
			this.ctx.maxAge = v1Config.maxAgeStatic;
			this.ctx.maxStale = v1Config.maxStale;
		} catch (error) {
			if (error instanceof got.RequestError) {
				return this.ctx.status = error.code === 'ETIMEDOUT' ? 504 : 502;
			} else if (error instanceof got.HTTPError) {
				return this.ctx.body = {
					status: error.response.statusCode || 502,
					message: error.response.body,
				};
			}

			throw error;
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

	async responseNotFound () {
		this.ctx.body = {
			status: 404,
			message: this.params.version ? `Couldn't find ${this.params.name}@${this.params.version}.` : `Couldn't fetch versions for ${this.params.name}.`,
		};
	}
}

module.exports = PackageRequest;

/**
 * Fetches repo tags from GitHub.
 * @param {string} user
 * @param {string} repo
 * @return {Promise<Object>}
 */
async function fetchGitHubMetadata (user, repo) {
	return fetchCache.get(`gh/${user}/${repo}`, () => {
		return githubApi.paginate(githubApi.repos.listTags.endpoint.merge({ repo, owner: user, per_page: 100 })).then((data) => {
			data.forEach((tag) => {
				if (tag.name.charAt(0) === 'v') {
					tag.name = tag.name.substr(1);
				}
			});

			return { tags: [], versions: _.uniq(_.map(data, 'name').filter(v => v).sort(vCompare.rCompare)) };
		}).catch((error) => {
			if (error.status === 403 && !error.block) {
				log.error(`GitHub API rate limit exceeded.`, error);
			}

			throw error;
		});
	});
}

/**
 * Sends a query to all configured registries and returns the first response.
 * @param {string} name
 * @return {Promise<Object>}
 */
async function fetchNpmMetadata (name) {
	return fetchCache.get(`npm/${name}`, async () => {
		name = name.charAt(0) === '@' ? '@' + encodeURIComponent(name.substr(1)) : encodeURIComponent(name);
		let response;

		if (typeof v1Config.npm.sourceUrl === 'string') {
			response = await got(`${v1Config.npm.sourceUrl}/${name}`, { json: true, timeout: 30000 });
		} else {
			response = await Promise.any(_.map(v1Config.npm.sourceUrl, (sourceUrl) => {
				return got(`${sourceUrl}/${name}`, { json: true, timeout: 30000 });
			}));
		}

		if (!response.body || !response.body.versions) {
			throw new Error(`Unable to retrieve versions for package ${name}.`);
		}

		return {
			tags: response.body['dist-tags'],
			versions: Object.keys(response.body.versions).sort(semver.rcompare),
		};
	});
}
