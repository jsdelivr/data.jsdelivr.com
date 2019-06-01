const relativeDayUtc = require('relative-day-utc');
const V1StatsRequest = require('../../routes/lib/v1/StatsRequest');

const PromiseLock = require('../promise-lock');
const promiseLock = new PromiseLock('pc');

const precacheLog = logger.scope('precache');
let runToday = false;

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

function run () {
	// Promise lock ensures this starts only in one process.
	promiseLock.get('run', async () => {
		precacheLog.info(`Precache function started.`);

		let dateRange = makeDateRange(30, 1);
		let redisCacheExpirationDate = relativeDayUtc(2);

		await Bluebird.mapSeries([
			() => makeRequest(V1StatsRequest, dateRange, makeCtx()).handleNetworkInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx()).handlePackagesInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({}, { page: 2 })).handlePackagesInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({}, { page: 3 })).handlePackagesInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({}, { page: 4 })).handlePackagesInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({}, { page: 5 })).handlePackagesInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({ all: true })).handlePackagesInternal(redisCacheExpirationDate),
		], (job, index) => {
			precacheLog.info(`Executing job #${index}.`);
			return job().catch(error => precacheLog.warn(`Error running job #${index}.`, error));
		});

		precacheLog.info(`Precache function finished.`);
	}).catch(() => {});
}

setInterval(() => {
	let hours = new Date().getUTCHours();

	if (hours === 0) {
		runToday = false;
	} else if (hours === 23 && !runToday) {
		runToday = true;
		run();
	}
}, 60 * 1000);
