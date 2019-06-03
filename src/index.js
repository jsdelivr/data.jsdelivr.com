// istanbul ignore next
if (require.main === module) {
	// This needs to run before any require() call.
	global.apmClient = require('elastic-apm-node').start({
		active: process.env.NODE_ENV === 'production',
		serviceName: 'jsdelivr-api',
		serviceVersion: require('../package.json').version,
		logLevel: 'fatal',
		captureExceptions: false,
		captureSpanStackTraces: false,
		captureErrorLogStackTraces: 'always',
		ignoreUrls: [ '/favicon.ico', '/heartbeat', '/amp_preconnect_polyfill_404_or_other_error_expected._Do_not_worry_about_it' ],
		errorOnAbortedRequests: true,
		abortedErrorThreshold: 30,
		transactionSampleRate: 1,
	});

	global.apmClient.addTransactionFilter(payload => (payload.context && payload.context.tags && payload.context.tags.userAgent && !payload.context.tags.userAgent.includes('sindresorhus/got')) || Math.random() < .2 ? payload : false);
	global.apmClient.addTransactionFilter(require('elastic-apm-utils').apm.transactionFilter());
	global.apmClient.addSpanFilter(require('elastic-apm-utils').apm.spanFilter({ filterShorterThan: 10 }));
	require('./lib/startup');
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

const debugHandler = require('./routes/debug');
const heartbeatHandler = require('./routes/heartbeat');
const v1Handler = require('./routes/v1');

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
 * Custom APM tags.
 */
if (global.apmClient) {
	server.use(async (ctx, next) => {
		let userAgent = ctx.headers['user-agent'];

		if (userAgent && !/\bchrome|edge|mozilla|opera|trident\b/i.test(userAgent)) {
			global.apmClient.addTags({ userAgent });
		}

		return next();
	});
}

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
 * Remove x-forwarded-port because it's wrong for CF + CC combo.
 */
server.use(async (ctx, next) => {
	delete ctx.headers['x-forwarded-port'];
	return next();
});

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
 * Replace 502/504 HTTP codes with 500,
 * because Cloudflare requires and enterprise account
 * to serve these correctly.
 */
server.use(async (ctx, next) => {
	await next();

	if ([ 502, 504 ].includes(ctx.status)) {
		ctx.status = 500;
	}
});

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

		if (ctx.status === 400) {
			ctx.body.message += `. Visit https://github.com/jsdelivr/data.jsdelivr.com for documentation.`;
		}
	} else if (!ctx.body.status) {
		ctx.status = 200;
	}

	if (ctx.body.status) {
		ctx.status = ctx.body.status;
	}

	if (ctx.maxAge) {
		ctx.set('Cache-Control', `public, max-age=${ctx.maxAge}${ctx.maxStale ? `, stale-while-revalidate=${ctx.maxStale}, stale-if-error=${ctx.maxStale}` : ''}`);
	} else if (ctx.expires) {
		ctx.set('Cache-Control', `public${ctx.maxStale ? `, stale-while-revalidate=${ctx.maxStale}, stale-if-error=${ctx.maxStale}` : ''}`);
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
server.on('error', (error, ctx) => {
	log.error('Koa server error.', error, { ctx });
});

// istanbul ignore next
if (require.main === module) {
	/**
	 * Start listening on the configured port.
	 */
	server.listen(process.env.PORT || serverConfig.port, function () {
		log.info(`Web server started at http://localhost:${this.address().port}, NODE_ENV=${process.env.NODE_ENV}.`);
	});

	/**
	 * Always log before exit.
	 */
	signalExit((code, signal) => {
		log[code === 0 ? 'info' : 'fatal']('Web server stopped.', { code, signal });
	});

	/**
	 * If we exit because of an uncaught exception, log the error details as well.
	 */
	process.on('uncaughtException', (error) => {
		log.fatal(`Uncaught exception. Exiting.`, error, { handled: false });

		setTimeout(() => {
			process.exit(1);
		}, 10000);
	});

	process.on('unhandledRejection', (error) => {
		log.fatal('Unhandled rejection. Exiting.', error, { handled: false });

		setTimeout(() => {
			process.exit(1);
		}, 10000);
	});
}

module.exports = server.callback();
