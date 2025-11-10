const RemoteResource = require('./RemoteResource');
const oneMonth = 30 * 24 * 60 * 60 * 1000;
const baseTtl = 10 * 60 * 1000;

class GitHubRemoteResource extends RemoteResource {
	get defaultTtlInternalRevalidate () {
		if (this.statusCode === 200) {
			return baseTtl;
		} else if (this.statusCode === 451 || (this.statusCode === 403 && this.data?.block)) { // The "block" property indicates GitHub blocked the account for ToS violation.
			return oneMonth;
		} else if (this.statusCode === 404) {
			return baseTtl * 6;
		}

		return super.defaultTtlInternalRevalidate;
	}

	get defaultTtlInternalStore () {
		if (this.statusCode === 200) {
			return oneMonth;
		}

		return super.defaultTtlInternalStore;
	}
}

module.exports = GitHubRemoteResource;
