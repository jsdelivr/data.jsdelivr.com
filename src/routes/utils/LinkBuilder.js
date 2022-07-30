const config = require('config');
const serverConfig = config.get('server');

class LinkBuilder {
	constructor (ctx) {
		this.ctx = ctx;
		this._refs = undefined;
		this._omitQuery = undefined;
		this._includeQuery = undefined;
		this._values = undefined;
		this._mapping = undefined;
		this._built = [];
	}

	build (resources) {
		return resources.map((resource) => {
			return {
				...resource,
				links: _.mapValues(this._refs, href => this._buildPublicUrl(href, resource)),
			};
		});
	}

	buildRef (ref, resources) {
		this._built.push(...resources.map((resource) => {
			return {
				...resource,
				links: {
					[ref]: this._buildPublicUrl(this._refs[ref], resource),
				},
			};
		}));

		return this;
	}

	_buildPublicUrl (route, resource) {
		let mappedResource = this._mapping
			? _.mapKeys(resource, (value, key) => Object.hasOwn(this._mapping, key) ? this._mapping[key] : key)
			: resource;

		mappedResource = this._values
			? { ...mappedResource, ...this._values }
			: mappedResource;

		let routeStack = this.ctx.router.route(route).stack;
		let urlPath = this.ctx.router.url(route, resource, {
			query: {
				..._.pick(_.omit(this.ctx.originalQuery, this._omitQuery), routeStack.at(-2)?.schemaKeys.query),
				..._.pick(mappedResource, this._includeQuery),
			},
		});

		return `${serverConfig.host}${urlPath}`;
	}

	includeQuery (query) {
		this._includeQuery = query;
		return this;
	}

	mapKeys (mapping) {
		this._mapping = mapping;
		return this;
	}

	mergeBy (property) {
		return Object.values(_.groupBy(this._built, property)).map(group => _.merge({}, ...group));
	}

	omitQuery (query) {
		this._omitQuery = query;
		return this;
	}

	refs (refs) {
		this._refs = refs;
		return this;
	}

	withValues (values) {
		this._values = values;
		return this;
	}
}

module.exports = LinkBuilder;
