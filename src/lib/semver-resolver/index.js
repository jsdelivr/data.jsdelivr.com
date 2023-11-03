const semver = require('semver');

module.exports.resolve = (manifest, specifier, tagSpecifier = specifier) => {
	let tags = manifest.tags || {};
	let versions = manifest.versions || {};
	tagSpecifier = tagSpecifier === '*' ? 'latest' : tagSpecifier;

	if (Object.hasOwn(versions, specifier)) {
		return { versionType: 'release', version: specifier };
	} else if (Object.hasOwn(tags, tagSpecifier) && Object.hasOwn(versions, tags[tagSpecifier])) {
		return { versionType: 'tag', version: tags[tagSpecifier] };
	}

	// If there wasn't a "latest" tag, we need to convert it to an empty range and resolve it manually.
	specifier = tagSpecifier === 'latest' ? '' : specifier;

	// Loosely based on https://github.com/npm/cli/blob/88ece8161021997cb5c22040b34d0dffff55fcf1/node_modules/npm-pick-manifest/lib/index.js#L166-L180
	// Prioritizes non-deprecated, non-prerelease versions.
	let matched = Object.keys(versions)
		.filter(v => semver.satisfies(v, specifier, { includePrerelease: !specifier }))
		.sort((a, b) => {
			let aParsed = semver.parse(a);
			let bParsed = semver.parse(b);

			return !versions[b].deprecated - !versions[a].deprecated
				|| !bParsed.prerelease.length - !aParsed.prerelease.length
				|| semver.rcompare(aParsed, bParsed);
		});

	return { versionType: 'alias', version: matched[0] || null };
};
