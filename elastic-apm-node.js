module.exports = {
	active: process.env.NODE_ENV === 'production',
	serviceName: 'jsdelivr-api',
	serviceVersion: require('./package.json').version,
	logLevel: 'fatal',
	captureExceptions: false,
	captureSpanStackTraces: false,
	captureErrorLogStackTraces: 'always',
	ignoreUrls: [ '/favicon.ico', '/heartbeat', '/amp_preconnect_polyfill_404_or_other_error_expected._Do_not_worry_about_it' ],
	errorOnAbortedRequests: true,
	abortedErrorThreshold: 30,
	transactionSampleRate: 1,
};
