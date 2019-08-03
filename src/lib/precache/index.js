const relativeDayUtc = require('relative-day-utc');
const V1StatsRequest = require('../../routes/lib/v1/StatsRequest');
const V1PackageRequest = require('../../routes/lib/v1/PackageRequest');

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
		let redisCacheExpirationDate = relativeDayUtc(2);

		await Bluebird.mapSeries([
			makeDateRange(1, 1),
			makeDateRange(7, 1),
			makeDateRange(30, 1),
			makeDateRange(365, 1),
		], dateRange => Bluebird.mapSeries([
			() => makeRequest(V1StatsRequest, dateRange, makeCtx()).handleNetworkInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({ all: true })).handlePackagesInternal(redisCacheExpirationDate).then((pkgs) => {
				// Also precache ranks for the top 10k packages.
				return Bluebird.map(pkgs.slice(0, 10000), pkg => makeRequest(V1PackageRequest, dateRange, makeCtx(pkg)).getRank(pkgs), { concurrency: 8 });
			}),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({ all: true, type: 'gh' })).handlePackagesInternal(redisCacheExpirationDate),
			() => makeRequest(V1StatsRequest, dateRange, makeCtx({ all: true, type: 'npm' })).handlePackagesInternal(redisCacheExpirationDate),
			..._.range(1, 11).map(page => () => makeRequest(V1StatsRequest, dateRange, makeCtx({}, { page })).handlePackagesInternal(redisCacheExpirationDate)),
			..._.range(1, 11).map(page => () => makeRequest(V1StatsRequest, dateRange, makeCtx({ type: 'gh' }, { page })).handlePackagesInternal(redisCacheExpirationDate)),
			..._.range(1, 11).map(page => () => makeRequest(V1StatsRequest, dateRange, makeCtx({ type: 'npm' }, { page })).handlePackagesInternal(redisCacheExpirationDate)),
		], (job, index) => {
			precacheLog.info(`Executing job #${index} with date range = ${dateRange.map(date => date.toISOString().substr(0, 10)).join(' - ')}.`);
			return job().catch(error => precacheLog.warn(`Error running job #${index}.`, error));
		}));

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
