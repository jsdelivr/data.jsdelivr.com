const Router = require('koa-router');
const isSha = require('is-hexdigest');
const koaElasticUtils = require('elastic-apm-utils').koa;
const Joi = require('joi');

const validate = require('../middleware/validate');
const schema = require('./schemas/v1');

const LookupRequest = require('./v1/LookupRequest');
const PackageRequest = require('./v1/PackageRequest');
const StatsRequest = require('./v1/StatsRequest');
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
	if (value && !ctx.params.repo) {
		ctx.params.repo = ctx.params.name;
		ctx.params.name = `${value}/${ctx.params.name}`;
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
 * Migrate the previous period path param to query strings params.
 */
router.param('period', async (value, ctx, next) => {
	if (value) {
		ctx.query.period = value;
	}

	return next();
});

/**
 * Lookup
 */
koaElasticUtils.addRoutes(router, [
	[ '/lookup/hash/:hash', '/lookup/hash/:hash' ],
], async (ctx) => {
	return new LookupRequest(ctx).handleHash();
});

/**
 * Package
 */
koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)' ],
	[ '/package/gh/:user/:repo', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleVersions();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name/stats', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year|all)?' ],
	[ '/package/gh/:user/:repo/stats', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year|all)?' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new PackageRequest(ctx).handlePackageStatsDeprecated();
});

koaElasticUtils.addRoutes(router, [
	// TODO: move this to /stats too?
	[ '/package/npm/:name/badge', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/badge/:period(day|week|month|year|all)?' ],
	[ '/package/gh/:user/:repo/badge', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/badge/:period(day|week|month|year|all)?' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new PackageRequest(ctx).handlePackageBadge();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name/badge/rank', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/badge/:rankType(rank|type-rank)/:period(day|week|month|year|all)?' ],
	[ '/package/gh/:user/:repo/badge/rank', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/badge/:rankType(rank|type-rank)/:period(day|week|month|year|all)?' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new PackageRequest(ctx).handlePackageBadgeRank();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name@:version', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/:structure(tree|flat)?' ],
	[ '/package/gh/:user/:repo@:version', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/:structure(tree|flat)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionFiles();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name@:version/entrypoints', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/entrypoints' ],
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageEntrypoints();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name@:version/stats', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year|all)?' ],
	[ '/package/gh/:user/:repo@:version/stats', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year|all)?' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new PackageRequest(ctx).handleVersionStatsDeprecated();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/resolve/npm/:name@:version', '/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version' ],
	[ '/package/resolve/npm/:name', '/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)' ],
	[ '/package/resolve/gh/:user/:repo@:version', '/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version' ],
	[ '/package/resolve/gh/:user/:repo', '/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleResolveVersion();
});

/**
 * Stats
 */
koaElasticUtils.addRoutes(router, [
	// TODO: removed the "type" param here to avoid overlap with new package stats endpoints,
	// TODO: which is a breaking change but it was undocumented and only used by Algolia. Send them a PR with a fix.
	[ '/stats/packages', '/stats/packages/:period(day|week|month|year|all)?/:all(all)?' ],
], validate({
	query: Joi.object({
		by: schema.byOptional,
		period: schema.period,
		...schema.paginatedStats,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePackages();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/packages/npm/:name', '/stats/packages/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)' ],
	[ '/stats/packages/gh/:user/:repo', '/stats/packages/:type(gh)/:user([^/@]+)/:name([^/@]+)' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePackageStats();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/packages/npm/:name@:version', '/stats/packages/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version' ],
	[ '/stats/packages/gh/:user/:repo@:version', '/stats/packages/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePackageVersionStats();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/packages/npm/:name/versions', '/stats/packages/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/versions' ],
	[ '/stats/packages/gh/:user/:repo/versions', '/stats/packages/:type(gh)/:user([^/@]+)/:name([^/@]+)/versions' ],
], validate({
	query: Joi.object({
		by: schema.by,
		period: schema.period,
		...schema.paginatedStats,
	}),
}), async (ctx) => {
	return new PackageRequest(ctx).handleTopVersions();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/packages/npm/:name@:version/files', '/stats/packages/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/files' ],
	[ '/stats/packages/gh/:user/:repo@:version/files', '/stats/packages/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/files' ],
], validate({
	query: Joi.object({
		by: schema.by,
		period: schema.period,
		...schema.paginatedStats,
	}),
}), async (ctx) => {
	return new PackageRequest(ctx).handleTopVersionFiles();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/periods', '/stats/periods' ],
], async (ctx) => {
	return new StatsRequest(ctx).handlePeriods();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/proxies/:name/', '/stats/proxies/:name' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handleProxyStats();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/network', '/stats/network/:period(day|week|month|year|all)?' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handleNetwork();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/network/countries', '/stats/network/countries' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handleCountries();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/network/providers', '/stats/network/providers' ],
], validate({
	query: Joi.object({
		period: schema.period,
	}).concat(schema.location),
}), async (ctx) => {
	return new StatsRequest(ctx).handleProviders();
});

Object.entries(StatsRequest.platformBrowserStats).forEach(([ path, handler ]) => {
	koaElasticUtils.addRoutes(router, [
		[ `/stats${path}`, `/stats${path}` ],
	], validate({
		query: Joi.object({
			period: schema.periodStatic,
			...schema.paginatedStats,
		}).concat(schema.location),
	}), async (ctx) => {
		return new StatsRequest(ctx).handleUsing(handler);
	});
});

module.exports = router;
