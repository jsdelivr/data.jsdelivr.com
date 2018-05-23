const Router = require('koa-router');
const relativeDayUtc = require('relative-day-utc');
const isSha = require('is-hexdigest');
const LookupRequest = require('./lib/v1/LookupRequest');
const PackageRequest = require('./lib/v1/PackageRequest');
const StatsRequest = require('./lib/v1/StatsRequest');
const router = new Router();

/**
 * More accurate opbeat route names.
 */
// router.use(async (ctx, next) => {
// 	let matched = ctx.matched.find(r => r.name);
//
// 	if (matched && global.OPBEAT_CLIENT) {
// 		global.OPBEAT_CLIENT.setTransactionName(`${ctx.request.method} /v1${matched.name}`);
// 	}
//
// 	return next();
// });

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

router.param('version', async (value, ctx, next) => {
	if (value && value.charAt(0) === 'v') {
		ctx.params.version = value.substr(1);
	} else if (value && (ctx.params.type === 'gh' && isSha(value, 'sha1'))) {
		ctx.params.version = value.toLowerCase();
	}

	return next();
});

addRoutes([
	[ '/lookup/hash/:hash', '/lookup/hash/:hash' ],
], async (ctx) => {
	return new LookupRequest(ctx).handleHash();
});

addRoutes([
	[ '/package/npm/:name', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)' ],
	[ '/package/gh/:user/:repo', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleVersions();
});

addRoutes([
	[ '/package/npm/:name/stats', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year)?' ],
	[ '/package/gh/:user/:repo/stats', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/stats/:groupBy(version|date)?/:period(day|week|month|year)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageStats();
});

addRoutes([
	[ '/package/npm/:name/badge', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)/badge/:period(day|week|month|year)?' ],
	[ '/package/gh/:user/:repo/badge', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)/badge/:period(day|week|month|year)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handlePackageBadge();
});

addRoutes([
	[ '/package/npm/:name@:version', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/:structure(tree|flat)?' ],
	[ '/package/gh/:user/:repo@:version', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/:structure(tree|flat)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionFiles();
});

addRoutes([
	[ '/package/npm/:name@:version/stats', '/package/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year)?' ],
	[ '/package/gh/:user/:repo@:version/stats', '/package/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version/stats/:groupBy(file|date)?/:period(day|week|month|year)?' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleVersionStats();
});

addRoutes([
	[ '/package/resolve/npm/:name@:version', '/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)@:version' ],
	[ '/package/resolve/npm/:name', '/package/resolve/:type(npm)/:user(@[^/@]+)?/:name([^/@]+)' ],
	[ '/package/resolve/gh/:user/:repo@:version', '/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)@:version' ],
	[ '/package/resolve/gh/:user/:repo', '/package/resolve/:type(gh)/:user([^/@]+)/:name([^/@]+)' ],
], async (ctx) => {
	return new PackageRequest(ctx).handleResolveVersion();
});

addRoutes([
	[ '/stats/packages', '/stats/packages/:period(day|week|month|year)?' ],
], async (ctx) => {
	return new StatsRequest(ctx).handlePackages();
});

addRoutes([
	[ '/stats/network', '/stats/network/:period(day|week|month|year)?' ],
], async (ctx) => {
	return new StatsRequest(ctx).handleNetwork();
});

module.exports = router;

function addRoutes (routes, fn) {
	routes.forEach((route) => {
		router.get(route[0], route[1], fn);
	});
}
