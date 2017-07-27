const Router = require('koa-router');
const PackageRequest = require('./lib/v1/PackageRequest');
const StatsRequest = require('./lib/v1/StatsRequest');
const router = new Router();

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

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)',
], async (ctx) => {
	return new PackageRequest(ctx).handleVersions();
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/stats',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/stats',
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageStats();
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version',
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionFiles();
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/stats',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/stats',
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionStats();
});

router.get([
	'/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version',
	'/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)',
	'/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version',
	'/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)',
], async (ctx) => {
	return new PackageRequest(ctx).handleResolveVersion();
});

router.get('/stats/packages', async (ctx) => {
	return new StatsRequest(ctx).handlePackages();
});

router.get('/stats/network', async (ctx) => {
	return new StatsRequest(ctx).handleNetwork();
});

module.exports = router;
