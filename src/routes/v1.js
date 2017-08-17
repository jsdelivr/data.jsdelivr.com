const Router = require('koa-router');
const relativeDayUtc = require('relative-day-utc');
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

router.param('period', async (value, ctx, next) => {
	switch (value) {
		case 'day':
			ctx.query.from = relativeDayUtc(-2).toISOString().substr(0, 10);
			break;

		case 'week':
			ctx.query.from = relativeDayUtc(-8).toISOString().substr(0, 10);
			break;

		case 'month':
			ctx.query.from = relativeDayUtc(-31).toISOString().substr(0, 10);
			break;

		case 'year':
			ctx.query.from = relativeDayUtc(-366).toISOString().substr(0, 10);
			break;
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
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year)?',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year)?',
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageStats();
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/badge/:period(day|week|month|year)?',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/badge/:period(day|week|month|year)?',
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageBadge();
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version',
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionFiles();
});

router.get([
	'/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year)?',
	'/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year)?',
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

router.get('/stats/packages/:period(day|week|month|year)?', async (ctx) => {
	return new StatsRequest(ctx).handlePackages();
});

router.get('/stats/network/:period(day|week|month|year)?', async (ctx) => {
	return new StatsRequest(ctx).handleNetwork();
});

module.exports = router;
