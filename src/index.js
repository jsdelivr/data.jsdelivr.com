// This needs to run before any require() call.
// istanbul ignore next
if (require.main === module) {
	const trace = require('@risingstack/trace');
	global.OPBEAT_CLIENT = require('opbeat').start({
		appId: '9bedaa8213',
		organizationId: '091f361b83f64dbcbac3d3c318636efc',
		secretToken: process.env.OPBEAT_TOKEN,
		logLevel: 'fatal',
		active: process.env.NODE_ENV === 'production',
		captureExceptions: false,
		ignoreUrls: [ '/favicon.ico', '/heartbeat' ],
		timeoutErrorThreshold: 30000,
	});

	require('./lib/startup');
	require('./lib/trace-cpu')(trace);
}

const config = require('config');
const signalExit = require('signal-exit');
const Koa = require('koa');
const koaFavicon = require('koa-favicon');
const koaResponseTime = require('koa-response-time');
const koaConditionalGet = require('koa-conditional-get');
const koaCompress = require('koa-compress');
const koaLogger = require('koa-logger');
const koaETag = require('koa-etag');
const koaJson = require('koa-json');
const Router = require('koa-router');
const statuses = require('statuses');

const debugHandler =  require('./routes/debug');
const heartbeatHandler =  require('./routes/heartbeat');
const v1Handler =  require('./routes/v1');

const serverConfig = config.get('server');

let server = new Koa();
let router = new Router();

/**
 * Server config.
 */
server.name = serverConfig.name;
server.keys = serverConfig.keys;
server.silent = server.env === 'production';
server.proxy = true;

/**
 * Handle favicon requests before anything else.
 */
server.use(koaFavicon(__dirname + '/public/favicon.ico'));

/**
 * Log requests during development.
 */
if (server.env === 'development') {
	server.use(koaLogger());
}

/**
 * Add a X-Response-Time header.
 */
server.use(koaResponseTime());

/**
 * Gzip compression.
 */
server.use(koaCompress());

/**
 * ETag support.
 */
server.use(koaConditionalGet());
server.use(koaETag());

/**
 * Normalize URLs.
 */
server.use((ctx, next) => {
	let { path, querystring } = ctx.request;

	if (path === '/' || !path.endsWith('/')) {
		return next();
	}

	ctx.status = 301;
	ctx.redirect(path.replace(/\/+$/, '') + (querystring ? `?${querystring}` : ''));
});

/**
 * Pretty-print JSON.
 */
server.use(koaJson({ spaces: '\t' }));

/**
 * Always respond with a JSON.
 */
server.use(async (ctx, next) => {
	await next();

	if (!ctx.body) {
		ctx.body = {
			status: ctx.status,
			message: statuses[ctx.status],
		};
	} else if (!ctx.body.status) {
		ctx.status = 200;
	}

	if (ctx.body.status) {
		ctx.status = ctx.body.status;
	}

	if (ctx.maxAge) {
		ctx.set('Cache-Control', `public, max-age=${ctx.maxAge}`);
	} else if (ctx.expires) {
		ctx.set('Cache-Control', `public`);
		ctx.set('Expires', ctx.expires);
	}
});

/**
 * Catch all errors to make sure we respond with a JSON.
 */
server.use(async (ctx, next) => {
	try {
		ctx.status = 400;
		await next();
	} catch (e) {
		ctx.status = 500;
		ctx.app.emit('error', e, ctx);
	}
});

/**
 * Set default headers.
 */
server.use(async (ctx, next) => {
	ctx.set(serverConfig.headers);
	return next();
});

/**
 * API v1.
 */
router.use('/v1', v1Handler.routes(), v1Handler.allowedMethods());

/**
 * Debug endpoint.
 */
router.get('/debug/' + serverConfig.debugToken, debugHandler);

/**
 * Heartbeat.
 */
router.get('/heartbeat', heartbeatHandler);

/**
 * Routing.
 */
server.use(router.routes()).use(router.allowedMethods());

/**
 * Koa error handling.
 */
server.on('error', (err, ctx) => {
	logger.error({ err, ctx }, 'Koa server error.');
});

// istanbul ignore next
if (require.main === module) {
	/**
	 * Start listening on the configured port.
	 */
	server.listen(process.env.PORT || serverConfig.port, () => {
		logger.info(`Web server started on port ${process.env.PORT || serverConfig.port}.`);
	});

	/**
	 * Always log before exit.
	 */
	signalExit((code, signal) => {
		logger[code === 0 ? 'info' : 'fatal']({ code, signal }, 'Web server stopped.');
	});

	/**
	 * If we exit because of an uncaught exception, log the error details as well.
	 */
	process.on('uncaughtException', (error) => {
		logger.fatal(error, `Fatal error. Exiting.`);

		setTimeout(() => {
			process.exit(1);
		}, 10000);
	});
}

module.exports = server.callback();
