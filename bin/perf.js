#!/usr/bin/env node
const got = require('got');
const Promise = require('bluebird');
const host = 'https://data.jsdelivr.com';

setTimeout(async () => {
	// npm
	await runOne('/v1/package/npm/jquery', 5000);// = ~350
	await runOne('/v1/package/npm/jquery/stats', 2000);// = ~50
	await runOne('/v1/package/npm/jquery@3.1.1', 5000);// = ~350
	await runOne('/v1/package/npm/jquery@3.1.1/stats', 5000);// = ~350
	await runOne('/v1/package/resolve/npm/jquery@3.1', 5000);// = ~350
	await runOne('/v1/stats/packages', 5000);
}, 2000);

function generateUrls (uri, n, data) {
	let urls = new Array(n).join().split(',').map(() => host + uri);
	let i = 0;

	if (!Array.isArray(data) || !data.length) {
		return urls;
	}

	return urls.map((url) => {
		if (i === data.length) {
			i = 0;
		}

		return url.replace('{placeholder}', data[i++]);
	});
}

function nthPercentile (data, n) {
	return data[Math.floor(data.length / 100 * n)];
}

function run (uri, urls, concurrencyLevels = [ 32, 128, 512, 1024 ]) {
	return Promise.mapSeries(concurrencyLevels, async (concurrency) => {
		let start = Date.now();
		let times = await Promise.map(urls, (url) => {
			let start = Date.now();

			return Promise.resolve(got(`${url}?_=${Math.random()}`, { timeout: 15000 })).catch(() => {}).then(() => {
				return Date.now() - start;
			});
		}, { concurrency });

		let duration = Date.now() - start;

		console.log(`uri: ${uri}`);
		console.log(`concurrency: ${concurrency}`);
		console.log(`number of requests: ${urls.length}`);
		console.log(`requests per second: ${Math.floor(urls.length / duration * 1000)}`);
		console.log(`duration: ${duration} ms`);
		times.sort((a, b) => a - b);

		[ 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99 ].forEach((n) => {
			console.log(`${n}th percentile: ${nthPercentile(times, n)} ms`);
		});

		console.log();
	});
}

function runOne (uri, n, concurrencyLevels) {
	return run(uri, generateUrls(uri, n), concurrencyLevels);
}
