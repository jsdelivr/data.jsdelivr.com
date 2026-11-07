import RemoteResource from './RemoteResource.js';

const oneMonth = 30 * 24 * 60 * 60 * 1000;
const baseTtl = 10 * 60 * 1000;

class GitHubRemoteResource extends RemoteResource {
	get isStale () {
		return this.props.staleRedirect || (this.props.redirect && Date.now() - this.props.redirect.checkedAt >= baseTtl * 6) || super.isStale;
	}

	get staleWhileRevalidate () {
		return this.props.redirect && Date.now() - this.props.redirect.checkedAt >= baseTtl * 6 ? 0 : super.staleWhileRevalidate;
	}

	get defaultTtlInternalRevalidate () {
		if (this.statusCode === 200) {
			return this.props.gitFetchedAt ? baseTtl * 6 : baseTtl;
		} else if (this.statusCode === 301 && this.props.redirect) {
			return baseTtl * 6;
		} else if (this.statusCode === 451 || (this.statusCode === 403 && this.data?.block)) { // The "block" property indicates GitHub blocked the account for ToS violation.
			return oneMonth;
		} else if (this.statusCode === 404) {
			return baseTtl * 6;
		}

		return super.defaultTtlInternalRevalidate;
	}

	get defaultTtlInternalStore () {
		if (this.statusCode === 200 || (this.statusCode === 301 && this.props.redirect)) {
			return oneMonth;
		}

		return super.defaultTtlInternalStore;
	}
}

export default GitHubRemoteResource;
