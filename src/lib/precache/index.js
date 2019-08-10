const execa = require('execa');

const PromiseLock = require('../promise-lock');
const promiseLock = new PromiseLock('pc');
const precacheLog = logger.scope('precache');

let runToday = false;

function run () {
	// Promise lock ensures this starts only in one process.
	promiseLock.get('run', async () => {
		runToday = true;

		try {
			await execa(process.execPath, [ ...process.execArgv, require.resolve('./run') ], { reject: false, stdio: 'inherit', timeout: 60 * 60 * 1000 });
		} catch (error) {
			precacheLog.error(`Precache process failed.`, error);
		}
	}, 2 * 60 * 1000).catch(() => {});
}

setInterval(() => {
	let hours = new Date().getUTCHours();

	if (hours === 0) {
		runToday = false;
	} else if (hours >= 22 && !runToday) {
		run();
	}
}, 60 * 1000);
