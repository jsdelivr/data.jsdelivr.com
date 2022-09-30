module.exports = {
	splitPackageUserAndName (resource) {
		if (!resource.name.includes('/')) {
			return { package: resource.name, repo: resource.name, ...resource };
		}

		let [ user, name ] = resource.name.split('/');
		return Object.assign({}, resource, { user: user.replace(/^@/, ''), package: name, repo: name });
	},
};
