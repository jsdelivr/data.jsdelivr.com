module.exports = {
	splitPackageUserAndName (resource) {
		if (!resource.name.includes('/')) {
			return resource;
		}

		let [ user, name ] = resource.name.split('/');
		return Object.assign({}, resource, { user: user.replace(/^@/, ''), name });
	},
};
