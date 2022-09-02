module.exports = {
	splitPackageUserAndName (resource) {
		if (!resource.name.includes('/')) {
			return resource;
		}

		let [ user, name ] = resource.name.split('/');
		return { ...resource, user: user.replace(/^@/, ''), name };
	},
};
