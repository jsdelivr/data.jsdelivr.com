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
		this._queryValues = undefined;
		this._mapping = undefined;
		this._built = [];
	}

	build (resources) {
		if (Array.isArray(resources)) {
			this.buildRefs(this._refs, resources);
			return this._built;
		}

		return Object.assign({}, resources, {
			links: _.mapValues(this._refs, href => this._buildPublicUrl(href, this._prepareResource(resources))),
		});
	}

	buildRefs (refs, resources) {
		this._built = this._built.concat(resources.map((resource) => {
			let prepared = this._prepareResource(resource);

			return Object.assign({}, resource, {
				links: _.mapValues(refs, href => this._buildPublicUrl(href, prepared)),
			});
		}));

		return this;
	}

	_buildPublicUrl (route, mappedResource) {
		let routeName = typeof route === 'function' ? route(mappedResource) : route;
		let { paramNames, stack } = this.ctx.router.route(routeName);
		let validator = stack.at(-2);

		let query = _.pickBy(Object.assign(
			_.pick(_.omit(this.ctx.originalQuery, this._omitQuery), validator?.schemaKeys?.query), // Keys from the current request if they are in the target schema as well.
			_.pick(mappedResource, validator?.requiredSchemaKeys?.query), // Keys required in the target schema.
			_.pick(mappedResource, this._includeQuery), // Explicitly added keys.
			this._queryValues // Explicitly added values that are not in mappedResource.
		), (v, k) => String(v) !== validator?.schemaDefaults?.query?.[k]); // Filter out default values.

		let requiredParamsDefaults = paramNames
			.filter(({ name, modifier }) => !mappedResource[name] && (!modifier || modifier === '+'))
			.map(({ name }) => [ name, `!${name}!` ]);

		if (requiredParamsDefaults.length) {
			mappedResource = Object.assign(Object.fromEntries(requiredParamsDefaults), mappedResource);
		}

		let urlPath = this.ctx.router.url(routeName, mappedResource, {
			query,
		}).replace(/!(\w+)!/g, '{$1}');

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

	_prepareResource (resource) {
		// Apply mapKeys()
		let mappedResource = this._mapping
			? _.mapKeys(resource, (value, key) => Object.hasOwn(this._mapping, key) ? this._mapping[key] : key)
			: resource;

		// Apply withValues()
		mappedResource = this._values
			? Object.assign({}, mappedResource, this._values)
			: mappedResource;

		// Apply transform()
		mappedResource = this._transform
			? this._transform(mappedResource)
			: mappedResource;

		return mappedResource;
	}

	refs (refs) {
		Object.assign(this._refs, refs);
		return this;
	}

	toLink (resources) {
		return this.build(resources).map((resource) => {
			return `<${resource.links.uri}>; rel="${resource.rel}"`;
		}).join(', ');
	}

	transform (transform) {
		this._transform = transform;
		return this;
	}

	withValues (values) {
		this._values = values;
		return this;
	}

	withQueryValues (values) {
		this._queryValues = values;
		return this;
	}
}

module.exports = LinkBuilder;
