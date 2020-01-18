const Router = require('koa-router');
const isSha = require('is-hexdigest');
const koaElasticUtils = require('elastic-apm-utils').koa;

const LookupRequest = require('./lib/v1/LookupRequest');
const PackageRequest = require('./lib/v1/PackageRequest');
const StatsRequest = require('./lib/v1/StatsRequest');
const router = new Router();

/**
 * More accurate APM route names.
 */
router.use(koaElasticUtils.middleware(global.apmClient, { prefix: '/v1' }));

router.param('hash', async (value, ctx, next) => {
	if (!isSha(value, 'sha256')) {
		return ctx.body = {
			status: 400,
			message: 'Hash must be a hex-encoded sha256 hash.',
		};
	}

	return next();
});

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

router.param('version', async (value, ctx, next) => {
	if (value && value.charAt(0) === 'v') {
		ctx.params.version = value.substr(1);
	} else if (value && (ctx.params.type === 'gh' && isSha(value, 'sha1'))) {
		ctx.params.version = value.toLowerCase();
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
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageStats();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name/badge', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/badge/:period(day|week|month|year|all)?' ],
	[ '/package/gh/:user/:repo/badge', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/badge/:period(day|week|month|year|all)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageBadge();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name@:version', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/:structure(tree|flat)?' ],
	[ '/package/gh/:user/:repo@:version', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/:structure(tree|flat)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionFiles();
});

koaElasticUtils.addRoutes(router, [
	[ '/package/npm/:name@:version/stats', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year|all)?' ],
	[ '/package/gh/:user/:repo@:version/stats', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year|all)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionStats();
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
	[ '/stats/packages/:type(gh|npm)?', '/stats/packages/:type(gh|npm)?/:period(day|week|month|year|all)?/:all(all)?' ],
], async (ctx) => {
	return new StatsRequest(ctx).handlePackages();
});

koaElasticUtils.addRoutes(router, [
	[ '/stats/network', '/stats/network/:period(day|week|month|year|all)?' ],
], async (ctx) => {
	return new StatsRequest(ctx).handleNetwork();
});

module.exports = router;
