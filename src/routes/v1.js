const Router = require('koa-router');
const PackageRequest = require('./lib/v1/PackageRequest');
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
	return new PackageRequest(ctx.path, ctx.params).handleVersions(ctx);
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/stats',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/stats',
], async (ctx) => {
	return new PackageRequest(ctx.path, ctx.params).handlePackageStats(ctx);
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version',
], async (ctx) => {
	return new PackageRequest(ctx.path, ctx.params).handleVersionFiles(ctx);
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/stats',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/stats',
], async (ctx) => {
	return new PackageRequest(ctx.path, ctx.params).handleVersionStats(ctx);
});

router.get([
	'/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version',
	'/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)',
	'/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version',
	'/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)',
], async (ctx) => {
	return new PackageRequest(ctx.path, ctx.params).handleResolveVersion(ctx);
});

module.exports = router;
