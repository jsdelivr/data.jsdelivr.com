global.apmClient = require('elastic-apm-node').start({});
require('../startup');

const relativeDayUtc = require('relative-day-utc');
const V1StatsRequest = require('../../routes/lib/v1/StatsRequest');
const V1PackageRequest = require('../../routes/lib/v1/PackageRequest');
const Package = require('../../models/Package');

const PromiseLock = require('../promise-lock');
const promiseLock = new PromiseLock('pc');
const precacheLog = logger.scope('precache');

function makeCtx (params = {}, query = {}) {
	return { params, query };
}

function makeDateRange (defaultDays, daysInFuture) {
	return [ relativeDayUtc(-2 - defaultDays + 1 + daysInFuture), relativeDayUtc(-2 + daysInFuture) ];
}

function makeRequest (Constructor, dateRange, ctx) {
	let request = new Constructor(ctx);
	request.dateRange = dateRange;
	return request;
}

async function run () {
	precacheLog.info(`Precache function started.`);
	let redisCacheExpirationDate = relativeDayUtc(2);

	let redisLockRefreshInterval = setInterval(() => {
		promiseLock.refresh('run', 2 * 60 * 1000).catch(() => {});
	}, 60 * 1000);

	try {
		await Bluebird.mapSeries([
			makeDateRange(1, 1),
			makeDateRange(7, 1),
			makeDateRange(30, 1),
			makeDateRange(365, 1),
		], dateRange => Bluebird.mapSeries([
			() => makeRequest(V1StatsRequest, dateRange, makeCtx()).handleNetworkInternal(redisCacheExpirationDate),
		], (job, index) => {
			precacheLog.info(`Executing job #${index} with date range = ${dateRange.map(date => date.toISOString().substr(0, 10)).join(' - ')}.`);
			return job().catch(error => precacheLog.warn(`Error running job #${index}.`, error));
		}));
	} catch (error) {
		precacheLog.info(`Precache function failed.`, error);
		throw error;
	} finally {
		clearInterval(redisLockRefreshInterval);
	}

	precacheLog.info(`Precache function finished.`);
	// When everything is done, set the lock for 2 hours to prevent other processes from trying to run this again.
	await promiseLock.refresh('run', 2 * 60 * 60 * 1000).catch(() => {});
}

setTimeout(() => {
	run().then(() => {
		process.exit();
	}).catch(() => {
		setTimeout(() => {
			process.exit(1);
		}, 10000);
	});
}, 2000);
