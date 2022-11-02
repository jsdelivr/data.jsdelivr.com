const Router = require('koa-router');
const isSha = require('is-hexdigest');
const koaElasticUtils = require('elastic-apm-utils').koa;
const Joi = require('joi');

const validate = require('../middleware/validate');
const schema = require('./schemas/v1');

const router = new Router({ strict: true, sensitive: true });

/**
 * More accurate APM route names.
 */
router.use(koaElasticUtils.middleware(global.apmClient, { prefix: '/v1' }));

/**
 * Validate hash param.
 */
router.param('hash', validate.param(schema.hash));

/**
 * name = @scope/name for npm, user/repo for GitHub
 */
router.param('user', async (value, ctx, next) => {
	if (!ctx.params.name) {
		if (!value) {
			ctx.params.name = ctx.params.type === 'npm' ? ctx.params.package : ctx.params.repo;
		} else {
			ctx.params.name = ctx.params.type === 'npm' ? `@${value}/${ctx.params.package}` : `${value}/${ctx.params.repo}`;
		}
	}

	return next();
});

router.param('package', async (value, ctx, next) => {
	if (!ctx.params.name) {
		ctx.params.name = value;
	}

	return next();
});

/**
 * Normalize version names.
 */
router.param('version', async (value, ctx, next) => {
	if (value && value.charAt(0) === 'v') {
		ctx.params.version = value.substr(1);
	} else if (value && (ctx.params.type === 'gh' && isSha(value, 'sha1'))) {
		ctx.params.version = value.toLowerCase();
	}

	return next();
});

/**
 * Migrate the previous path params to query strings params.
 */
router.param('period', async (value, ctx, next) => {
	if (value) {
		ctx.query.period = value;
	}

	return next();
});

router.param('structure', async (value, ctx, next) => {
	if (value) {
		ctx.query.structure = value;
	}

	return next();
});

const routes = {
	'/lookup/hash/:hash': {
		handlers: [
			async (ctx) => {
				return new LookupRequest(ctx).handleHash();
			},
		],
	},

	/**
	 * Package (deprecated)
	 */
	'/package/:type/:name': {
		paths: [
			{
				name: '/package/npm/:package',
				path: '/package/:type(npm)/:package([^/@]+)',
			},
			{
				name: '/package/npm/@:scope/:package',
				path: '/package/:type(npm)/@:user([^/@]+)/:package([^/@]+)',
			},
			{
				name: '/package/gh/:user/:repo',
				path: '/package/:type(gh)/:user([^/@]+)/:repo([^/@]+)',
			},
		],
		handlers: [
			async (ctx) => {
				return new PackageRequest(ctx).handleVersionsDeprecated();
			},
		],
	},
	'/package/:type/:name/badge': {
		paths: [
			{
				name: '/package/npm/:package/badge',
				path: '/package/:type(npm)/:package([^/@]+)/badge/:period(day|week|month|year)?',
			},
			{
				name: '/package/npm/@:scope/:package/badge',
				path: '/package/:type(npm)/@:user([^/@]+)/:package([^/@]+)/badge/:period(day|week|month|year)?',
			},
			{
				name: '/package/gh/:user/:repo/badge',
				path: '/package/:type(gh)/:user([^/@]+)/:repo([^/@]+)/badge/:period(day|week|month|year)?',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodFloating,
				}),
			}),
			async (ctx) => {
				ctx.state.query.type = 'hits';
				return new PackageRequest(ctx).handlePackageBadge();
			},
		],
	},
	'/package/:type/:name/badge/rank': {
		paths: [
			{
				name: '/package/npm/:package/badge/rank',
				path: '/package/:type(npm)/:package([^/@]+)/badge/:rankType(rank|type-rank)/:period(day|week|month|year)?',
			},
			{
				name: '/package/npm/@:scope/:package/badge/rank',
				path: '/package/:type(npm)/@:user([^/@]+)/:package([^/@]+)/badge/:rankType(rank|type-rank)/:period(day|week|month|year)?',
			},
			{
				name: '/package/gh/:user/:repo/badge/rank',
				path: '/package/:type(gh)/:user([^/@]+)/:repo([^/@]+)/badge/:rankType(rank|type-rank)/:period(day|week|month|year)?',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodFloating,
				}),
			}),
			async (ctx) => {
				ctx.state.query.type = ctx.params.rankType;
				return new PackageRequest(ctx).handlePackageBadge();
			},
		],
	},
	'/package/:type/:name/stats': {
		paths: [
			{
				name: '/package/npm/:package/stats',
				path: '/package/:type(npm)/:package([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year)?',
			},
			{
				name: '/package/npm/@:scope/:package/stats',
				path: '/package/:type(npm)/@:user([^/@]+)/:package([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year)?',
			},
			{
				name: '/package/gh/:user/:repo/stats',
				path: '/package/:type(gh)/:user([^/@]+)/:repo([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year)?',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodFloating,
				}),
			}),
			async (ctx) => {
				return new PackageRequest(ctx).handlePackageStatsDeprecated();
			},
		],
	},
	'/package/:type/:name@:version': {
		paths: [
			{
				name: '/package/npm/:package@:version',
				path: '/package/:type(npm)/:package([^/@]+)@:version/:structure(tree|flat)?',
			},
			{
				name: '/package/npm/@:scope/:package@:version',
				path: '/package/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version/:structure(tree|flat)?',
			},
			{
				name: '/package/gh/:user/:repo@:version',
				path: '/package/:type(gh)/:user([^/@]+)/:repo([^/@]+)@:version/:structure(tree|flat)?',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					structure: schema.structure,
				}),
			}),
			async (ctx) => {
				return new PackageRequest(ctx).handleVersionFilesDeprecated();
			},
		],
	},
	'/package/:type/:name@:version/entrypoints': {
		paths: [
			{
				name: '/package/npm/:package@:version/entrypoints',
				path: '/package/:type(npm)/:package([^/@]+)@:version/entrypoints',
			},
			{
				name: '/package/npm/@:scope/:package@:version/entrypoints',
				path: '/package/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version/entrypoints',
			},
		],
		handlers: [
			async (ctx) => {
				return new PackageRequest(ctx).handlePackageEntrypoints(false);
			},
		],
	},
	'/package/:type/:name@:version/stats': {
		paths: [
			{
				name: '/package/npm/:package@:version/stats',
				path: '/package/:type(npm)/:package([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year)?',
			},
			{
				name: '/package/npm/@:scope/:package@:version/stats',
				path: '/package/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year)?',
			},
			{
				name: '/package/gh/:user/:repo@:version/stats',
				path: '/package/:type(gh)/:user([^/@]+)/:repo([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year)?',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodFloating,
				}),
			}),
			async (ctx) => {
				return new PackageRequest(ctx).handleVersionStatsDeprecated();
			},
		],
	},
	'/package/resolve/:type/:name': {
		paths: [
			{
				name: '/package/resolve/npm/:package',
				path: '/package/resolve/:type(npm)/:package([^/@]+)',
			},
			{
				name: '/package/resolve/npm/@:scope/:package',
				path: '/package/resolve/:type(npm)/@:user([^/@]+)/:package([^/@]+)',
			},
			{
				name: '/package/resolve/gh/:user/:repo',
				path: '/package/resolve/:type(gh)/:user([^/@]+)/:repo([^/@]+)',
			},
		],
		handlers: [
			async (ctx) => {
				return new PackageRequest(ctx).handleResolveVersionDeprecated();
			},
		],
	},
	'/package/resolve/:type/:name@:version': {
		paths: [
			{
				name: '/package/resolve/npm/:package@:version',
				path: '/package/resolve/:type(npm)/:package([^/@]+)@:version',
			},
			{
				name: '/package/resolve/npm/@:scope/:package@:version',
				path: '/package/resolve/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version',
			},
			{
				name: '/package/resolve/gh/:user/:repo@:version',
				path: '/package/resolve/:type(gh)/:user([^/@]+)/:repo([^/@]+)@:version',
			},
		],
		handlers: [
			async (ctx) => {
				return new PackageRequest(ctx).handleResolveVersionDeprecated();
			},
		],
	},

	/**
	 * Packages
	 */
	'/packages/:type/:name': {
		paths: [
			{
				name: '/packages/npm/:package',
				path: '/packages/:type(npm)/:package([^/@]+)',
			},
			{
				name: '/packages/npm/@:scope/:package',
				path: '/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)',
			},
			{
				name: '/packages/gh/:user/:repo',
				path: '/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)',
			},
		],
		handlers: [
			async (ctx) => {
				return new PackageRequest(ctx).handlePackage();
			},
		],
	},
	'/packages/:type/:name@:version': {
		paths: [
			{
				name: '/packages/npm/:package@:version',
				path: '/packages/:type(npm)/:package([^/@]+)@:version',
			},
			{
				name: '/packages/npm/@:scope/:package@:version',
				path: '/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version',
			},
			{
				name: '/packages/gh/:user/:repo@:version',
				path: '/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)@:version',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					structure: schema.structure,
				}),
			}),
			async (ctx) => {
				return new PackageRequest(ctx).handleVersion();
			},
		],
	},
	'/packages/:type/:name@:version/entrypoints': {
		paths: [
			{
				name: '/packages/npm/:package@:version/entrypoints',
				path: '/packages/:type(npm)/:package([^/@]+)@:version/entrypoints',
			},
			{
				name: '/packages/npm/@:scope/:package@:version/entrypoints',
				path: '/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version/entrypoints',
			},
		],
		handlers: [
			async (ctx) => {
				return new PackageRequest(ctx).handlePackageEntrypoints();
			},
		],
	},
	'/packages/:type/:name/resolved': {
		paths: [
			{
				name: '/packages/npm/:package/resolved',
				path: '/packages/:type(npm)/:package([^/@]+)/resolved',
			},
			{
				name: '/packages/npm/@:scope/:package/resolved',
				path: '/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)/resolved',
			},
			{
				name: '/packages/gh/:user/:repo/resolved',
				path: '/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)/resolved',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					specifier: schema.specifier,
				}),
			}),
			async (ctx) => {
				return new PackageRequest(ctx).handleResolvedVersion();
			},
		],
	},

	/**
	 * Stats
	 */
	'/stats/network': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.period,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleNetwork();
			},
		],
	},
	'/stats/network/content': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.period,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleNetworkContent();
			},
		],
	},
	'/stats/network/countries': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.period,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleNetworkCountries();
			},
		],
	},
	'/stats/packages': {
		paths: [
			{
				name: '/stats/packages',
				path: '/stats/packages/:all(all)?',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					by: schema.by,
					type: schema.type,
					period: schema.period,
					...schema.paginatedStats,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handlePackages();
			},
		],
	},
	'/deprecated/stats/packages': {
		paths: [
			{
				name: '/stats/packages',
				path: '/stats/packages/:period(day|week|month|year)?/:all(all)?',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					by: schema.by,
					period: schema.period,
					...schema.paginatedStats,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handlePackages();
			},
		],
	},
	'/stats/packages/:type/:name': {
		paths: [
			{
				name: '/stats/packages/npm/:package',
				path: '/stats/packages/:type(npm)/:package([^/@]+)',
			},
			{
				name: '/stats/packages/npm/@:scope/:package',
				path: '/stats/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)',
			},
			{
				name: '/stats/packages/gh/:user/:repo',
				path: '/stats/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					period: schema.period,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handlePackageStats();
			},
		],
	},
	'/stats/packages/:type/:name/badge': {
		paths: [
			{
				name: '/stats/packages/npm/:package/badge',
				path: '/stats/packages/:type(npm)/:package([^/@]+)/badge',
			},
			{
				name: '/stats/packages/npm/@:scope/:package/badge',
				path: '/stats/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)/badge',
			},
			{
				name: '/stats/packages/gh/:user/:repo/badge',
				path: '/stats/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)/badge',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodFloating,
					type: schema.statsBadgeType,
				}),
			}),
			async (ctx) => {
				return new PackageRequest(ctx).handlePackageBadge();
			},
		],
	},
	'/stats/packages/:type/:name/versions': {
		paths: [
			{
				name: '/stats/packages/npm/:package/versions',
				path: '/stats/packages/:type(npm)/:package([^/@]+)/versions',
			},
			{
				name: '/stats/packages/npm/@:scope/:package/versions',
				path: '/stats/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)/versions',
			},
			{
				name: '/stats/packages/gh/:user/:repo/versions',
				path: '/stats/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)/versions',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					by: schema.by,
					period: schema.period,
					...schema.paginatedStats,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPackageVersions();
			},
		],
	},
	'/stats/packages/:type/:name@:version': {
		paths: [
			{
				name: '/stats/packages/npm/:package@:version',
				path: '/stats/packages/:type(npm)/:package([^/@]+)@:version',
			},
			{
				name: '/stats/packages/npm/@:scope/:package@:version',
				path: '/stats/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version',
			},
			{
				name: '/stats/packages/gh/:user/:repo@:version',
				path: '/stats/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)@:version',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					period: schema.period,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handlePackageVersionStats();
			},
		],
	},
	'/stats/packages/:type/:name@:version/files': {
		paths: [
			{
				name: '/stats/packages/npm/:package@:version/files',
				path: '/stats/packages/:type(npm)/:package([^/@]+)@:version/files',
			},
			{
				name: '/stats/packages/npm/@:scope/:package@:version/files',
				path: '/stats/packages/:type(npm)/@:user([^/@]+)/:package([^/@]+)@:version/files',
			},
			{
				name: '/stats/packages/gh/:user/:repo@:version/files',
				path: '/stats/packages/:type(gh)/:user([^/@]+)/:repo([^/@]+)@:version/files',
			},
		],
		handlers: [
			validate({
				query: Joi.object({
					by: schema.by,
					period: schema.period,
					...schema.paginatedStats,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPackageVersionFiles();
			},
		],
	},
	'/stats/periods': {
		handlers: [
			validate({
				query: Joi.object({
					...schema.paginatedStats,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handlePeriods();
			},
		],
	},
	'/stats/platforms': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPlatforms();
			},
		],
	},
	'/stats/platforms/versions': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPlatformsVersions();
			},
		],
	},
	'/stats/platforms/:name/browsers': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPlatformBrowsers();
			},
		],
	},
	'/stats/platforms/:name/countries': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPlatformCountries();
			},
		],
	},
	'/stats/platforms/:name/versions': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPlatformVersions();
			},
		],
	},
	'/stats/platforms/:name/versions/:version/countries': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopPlatformVersionCountries();
			},
		],
	},
	'/stats/browsers': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopBrowsers();
			},
		],
	},
	'/stats/browsers/versions': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopBrowsersVersions();
			},
		],
	},
	'/stats/browsers/:name/countries': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopBrowserCountries();
			},
		],
	},
	'/stats/browsers/:name/platforms': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopBrowserPlatforms();
			},
		],
	},
	'/stats/browsers/:name/versions': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopBrowserVersions();
			},
		],
	},
	'/stats/browsers/:name/versions/:version/countries': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.periodStatic,
					...schema.paginatedStats,
				}).concat(schema.location),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleTopBrowserVersionCountries();
			},
		],
	},
	'/stats/proxies/:name': {
		handlers: [
			validate({
				query: Joi.object({
					period: schema.period,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleProxyStats();
			},
		],
	},
	'/stats/proxies/:name/files': {
		handlers: [
			validate({
				query: Joi.object({
					by: schema.by,
					period: schema.period,
					...schema.paginatedStats,
				}),
			}),
			async (ctx) => {
				return new StatsRequest(ctx).handleProxyFiles();
			},
		],
	},
};

module.exports.routes = routes;
module.exports.router = router;

Object.entries(routes).forEach(([ routeName, definition ]) => {
	_.defaults(definition, {
		getName (resource = {}) {
			if (this.paths.length === 1) {
				return this.paths[0].name;
			}

			return resource.type === 'npm'
				? resource.user
					? this.paths[1].name
					: this.paths[0].name
				: this.paths[2].name;
		},
		paths: [{ name: routeName, path: routeName }],
	});

	koaElasticUtils.addRoutes(router, definition.paths.map(p => [ p.name, p.path ]), ...definition.handlers);
});

const LookupRequest = require('./v1/LookupRequest');
const PackageRequest = require('./v1/PackageRequest');
const StatsRequest = require('./v1/StatsRequest');
