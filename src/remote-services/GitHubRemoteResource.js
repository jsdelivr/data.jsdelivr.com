const RemoteResource = require('./RemoteResource');
const oneWeek = 7 * 24 * 60 * 60;
const baseTtl = 10 * 60;

class GitHubRemoteResource extends RemoteResource {
	get defaultTtlInternalRevalidate () {
		if (this.statusCode === 200) {
			return baseTtl;
		} else if ([ 403, 451 ].includes(this.statusCode)) {
			return this.error.block ? oneWeek : 0;
		} else if (this.statusCode === 404) {
			return baseTtl * 6;
		}

		return 0;
	}

	get defaultTtlInternalStore () {
		if (this.statusCode === 200) {
			return oneWeek;
		}

		return this.ttlInternalRevalidate;
	}
}

module.exports = GitHubRemoteResource;
