const Router = require('koa-router');
const isSha = require('is-hexdigest');
const koaElasticUtils = require('elastic-apm-utils').koa;
const Joi = require('joi');

const validate = require('./middleware/validate');
const schema = require('./schemas/v1');

const LookupRequest = require('./lib/v1/LookupRequest');
const PackageRequest = require('./lib/v1/PackageRequest');
const ProxyRequest = require('./lib/v1/ProxyRequest');
const StatsRequest = require('./lib/v1/StatsRequest');
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

koaElasticUtils.addRoutes(router, [
	[ '/lookup/hash/:hash', '/lookup/hash/:hash' ],
], async (ctx) => {
	return new LookupRequest(ctx).handleHash();
});

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
		type: schema.type,
		period: schema.period,
	}),
}), async (ctx) => {
	if (ctx.params.groupBy || ctx.params.period || (!ctx.query.type && !ctx.query.period)) {
		return new PackageRequest(ctx).handlePackageStatsDeprecated();
	}

	if (!validate.single(schema.queryTypeRequired, ctx.query, ctx)) {
		return;
	}

	return new PackageRequest(ctx).handlePackageStats();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name/stats/versions', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/stats/versions' ],
	[ '/package/gh/:user/:repo/stats/versions', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/stats/versions' ],
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
		type: schema.type,
		period: schema.period,
	}),
}), async (ctx) => {
	if (ctx.params.groupBy || ctx.params.period || (!ctx.query.type && !ctx.query.period)) {
		return new PackageRequest(ctx).handleVersionStatsDeprecated();
	}

	if (!validate.single(schema.queryTypeRequired, ctx.query, ctx)) {
		return;
	}

	return new PackageRequest(ctx).handleVersionStats();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name@:version/stats/files', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/stats/files' ],
	[ '/package/gh/:user/:repo@:version/stats/files', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/stats/files' ],
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
	[ '/package/resolve/npm/:name@:version', '/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version' ],
	[ '/package/resolve/npm/:name', '/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)' ],
	[ '/package/resolve/gh/:user/:repo@:version', '/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version' ],
	[ '/package/resolve/gh/:user/:repo', '/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleResolveVersion();
});

koaElasticUtils.addRoutes(router, [
	[ '/proxy/:name/stats', '/proxy/:name/stats' ],
], validate({
	query: Joi.object({
		type: schema.typeRequired,
		period: schema.period,
	}),
}), async (ctx) => {
	return new ProxyRequest(ctx).handleProxyStats();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/packages/:type(gh|npm)?', '/stats/packages/:type(gh|npm)?/:period(day|week|month|year|all)?/:all(all)?' ],
], validate({
	query: Joi.object({
		period: schema.period,
		...schema.paginatedStats,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePackages();
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
		type: schema.typeRequired,
	}),
}), async (ctx) => {
	return new StatsRequest(ctx).handleCountries();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/network/providers', '/stats/network/providers' ],
], validate({
	query: Joi.object({
		period: schema.period,
		type: schema.typeRequired,
	}).concat(schema.location),
}), async (ctx) => {
	return new StatsRequest(ctx).handleProviders();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/platforms', '/stats/platforms' ],
], validate({
	query: Joi.object({
		period: schema.periodStatic,
		...schema.paginatedStats,
	}).concat(schema.location),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePlatforms();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/platforms/versions', '/stats/platforms/versions' ],
], validate({
	query: Joi.object({
		period: schema.periodStatic,
		...schema.paginatedStats,
	}).concat(schema.location),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePlatformsVersions();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/platforms/:name/browsers', '/stats/platforms/:name/browsers' ],
], validate({
	query: Joi.object({
		period: schema.periodStatic,
		...schema.paginatedStats,
	}).concat(schema.location),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePlatformBrowsers();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/platforms/:name/versions', '/stats/platforms/:name/versions' ],
], validate({
	query: Joi.object({
		period: schema.periodStatic,
		...schema.paginatedStats,
	}).concat(schema.location),
}), async (ctx) => {
	return new StatsRequest(ctx).handlePlatformVersions();
});

module.exports = router;
