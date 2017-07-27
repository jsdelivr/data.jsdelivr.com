const got = require('got');
const semver = require('semver');
const config = require('config');
const GitHubApi = require('github');

const v1Config = config.get('v1');
const githubApi = new GitHubApi({
	Promise,
	protocol: 'https',
	host: v1Config.gh.sourceUrl,
	headers: { 'user-agent': 'jsDelivr API backend' },
	timeout: 30000,
});

if (v1Config.gh.apiToken) {
	githubApi.authenticate({
		type: 'token',
		token: v1Config.gh.apiToken,
	});
}

class PackageRequest {
	constructor (url, params) {
		this.url = url;
		this.params = params;
		this.keys = {
			files: `package/${this.params.type}/${this.params.name}@${this.params.version}/files`,
			metadata: `package/${this.params.type}/${this.params.name}/metadata`,
			packageStats: `package/${this.params.type}/${this.params.name}/stats`,
			versionsStats: `package/${this.params.type}/${this.params.name}@${this.params.version}/stats`,
		};
	}

	async fetchFiles () {
		return got(`${v1Config.cdn.sourceUrl}/${this.params.type}/${this.params.name}@${this.params.version}/+json`, { json: true, timeout: 30000 }).then((response) => {
			return response.body;
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
		return JSON.parse(await this.getFilesAsJson());
	}

	async getFilesAsJson () {
		let files = await redis.getAsync(this.keys.files);

		if (files) {
			return files;
		}

		files = JSON.stringify(_.pick(await this.fetchFiles(), [ 'default', 'files' ]), null, '\t');
		await redis.setAsync(this.keys.files, files);
		return files;
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

	async getMetadata () {
		return JSON.parse(await this.getMetadataAsJson());
	}

	async getMetadataAsJson () {
		let metadata = await redis.getAsync(this.keys.metadata);

		if (metadata) {
			return metadata;
		}

		metadata = JSON.stringify(await this.fetchMetadata(), null, '\t');
		await redis.setAsync(this.keys.metadata, metadata, 'EX', v1Config[this.params.type].maxAge);
		return metadata;
	}

	async handleResolveVersion (ctx) {
		try {
			ctx.body = { version: await this.getResolvedVersion() };
		} catch (e) {
			return this.responseNotFound(ctx);
		}
	}

	async handleVersions (ctx) {
		try {
			ctx.body = await this.getMetadataAsJson();
		} catch (e) {
			return this.responseNotFound(ctx);
		}
	}

	async handlePackageStats (ctx) {
		return this.responseNotFound(ctx); // TODO
	}

	async handleVersionFiles (ctx) {
		let metadata;

		try {
			metadata = await this.getMetadata();
		} catch (e) {
			return this.responseNotFound(ctx);
		}

		if (!metadata.versions.includes(ctx.params.version)) {
			return ctx.body = {
				status: 404,
				message: `Couldn't find version ${ctx.params.version} for ${ctx.params.name}. Make sure you use a specific version number, and not a version range or a tag.`,
			};
		}

		try {
			ctx.body = await this.getFilesAsJson();
			ctx.maxAge = v1Config.maxAgeStatic;
		} catch (e) {
			if (e instanceof got.ParseError) {
				return ctx.body = {
					status: e.response.statusCode || 502,
					message: e.response.body,
				};
			}

			throw e;
		}
	}

	async handleVersionStats (ctx) {
		return this.responseNotFound(ctx); // TODO
	}

	async responseNotFound (ctx) {
		ctx.body = {
			status: 404,
			message: `Couldn't find ${this.params.name}@${this.params.version}.`,
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
	let versions = [];
	let loadMore = (response) => {
		versions.push(..._.map(response.data, 'name'));

		if (response.data && githubApi.hasNextPage(response)) {
			return githubApi.getNextPage(response).then(loadMore);
		}

		return { tags: [], versions };
	};

	return githubApi.repos.getTags({ repo, owner: user, per_page: 100 }).then(loadMore).catch((err) => {
		if (err.code === 403) {
			logger.error({ err }, `GitHub API rate limit exceeded.`);
		}

		throw err;
	});
}

/**
 * Sends a query to all configured registries and returns the first response.
 * @param {string} name
 * @return {Promise<Object>}
 */
async function fetchNpmMetadata (name) {
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
}
