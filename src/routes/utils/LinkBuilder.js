const config = require('config');
const serverConfig = config.get('server');

/**
 * Builds URLs to resources. Usage examples:
 *
 * 1. Single resource
 *
 *  params = { type: 'npm', name: 'jquery' }
 *
 *  new LinkBuilder(ctx)
 *      .refs({
 *          versions: params.type === 'npm' ? '/stats/packages/npm/:name/versions' : '/stats/packages/gh/:user/:repo/versions',
 *      })
 * 	    .transform(splitPackageUserAndName)
 * 	    .withValues({ ...params, by: 'hits' })
 * 	    .build({ hits: { ... }, bandwidth: { ... } })
 *
 * 	=> { hits: { ... }, bandwidth: { ... }, links: { versions: 'https://data.jsdelivr.com/v1/stats/packages/npm/jquery/versions?by=hits' } }
 *
 * 2. Array of resources
 *
 *  new LinkBuilder(ctx)
 *      .refs({
 * 	        ...!r.query.country && { countries: '/stats/platforms/:name/versions/:version/countries' },
 * 	    })
 * 	    .build([{ name: '...', version: '...' }, { name: '...', version: '...' }])
 *-
 * 	=> [{ name: '...', version: '...', links: { countries: '...' } }, { name: '...', version: '...', links: { countries: '...' } }]
 *
 * 3. Array of resources with different sets of links
 *
 *  new LinkBuilder(ctx)
 *      .includeQuery([ 'period' ])
 * 	    .buildRefs({ browsers: '/stats/browsers' }, [{ period: 'A' }, { period: 'B' }])
 * 	    .buildRefs({ platforms: '/stats/platforms' }, [{ period: 'A' }, { period: 'C' }])
 * 	    .mergeBy('period')
 *
 *  => [
 *      { period: 'A', links: { browsers: '...', platforms: '...' } },
 *      { period: 'B', links: { browsers: '...' } },
 *      { period: 'C', links: { platforms: '...' } },
 *     ]
 */
class LinkBuilder {
	constructor (ctx, options) {
		this.ctx = ctx;
		this.options = { omitQuery: [], ...options };
		this._refs = {};
		this._transform = undefined;
		this._omitQuery = [ ...this.options.omitQuery ];
		this._includeQuery = undefined;
		this._values = undefined;
		this._mapping = undefined;
		this._built = [];
	}

	build (resources) {
		if (Array.isArray(resources)) {
			this.buildRefs(this._refs, resources);
			return this._built;
		}

		return {
			...resources,
			links: _.mapValues(this._refs, href => this._buildPublicUrl(href, resources)),
		};
	}

	buildRefs (refs, resources) {
		this._built.push(...resources.map((resource) => {
			return {
				...resource,
				links: _.mapValues(refs, href => this._buildPublicUrl(href, resource)),
			};
		}));

		return this;
	}

	_buildPublicUrl (route, resource) {
		// Apply mapKeys()
		let mappedResource = this._mapping
			? _.mapKeys(resource, (value, key) => Object.hasOwn(this._mapping, key) ? this._mapping[key] : key)
			: resource;

		// Apply withValues()
		mappedResource = this._values
			? { ...mappedResource, ...this._values }
			: mappedResource;

		// Apply transform()
		mappedResource = this._transform
			? this._transform(mappedResource)
			: mappedResource;

		let routeName = typeof route === 'function' ? route(resource) : route;
		let validator = this.ctx.router.route(routeName).stack.at(-2);
		let urlPath = this.ctx.router.url(routeName, mappedResource, {
			query: {
				..._.pick(_.omit(this.ctx.originalQuery, this._omitQuery), validator?.schemaKeys?.query),
				..._.pick(mappedResource, validator?.requiredSchemaKeys?.query),
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
		this._omitQuery = [ ...this.options.omitQuery, ...query ];
		return this;
	}

	refs (refs) {
		Object.assign(this._refs, refs);
		return this;
	}

	transform (transform) {
		this._transform = transform;
		return this;
	}

	withValues (values) {
		this._values = values;
		return this;
	}
}

module.exports = LinkBuilder;
