import os from 'os';
import childProcess from 'child_process';
import relativeDayUtc from 'relative-day-utc';
import Bluebird from 'bluebird';
import config from 'config';
import pkg from '../../package.json' with { type: 'json' };

const version = pkg.version;
const serverConfig = config.get('server');
let commit = 'git not available';

try {
	commit = childProcess.execSync('git log -1 "--format=%cd - commit %H"', { encoding: 'utf8' }).trim();
} catch {}

export default async (ctx) => {
	if (!serverConfig.debugToken) {
		return ctx.status = 403;
	}

	ctx.body = {
		version,
		commit,
		osUptime: os.uptime(),
		freeMemory: os.freemem(),
		totalMemory: os.totalmem(),
		loadAverage: os.loadavg(),
		hostname: os.hostname(),
		networkInterfaces: os.networkInterfaces(),
		date: new Date().toISOString().substr(0, 10),
		date2d: relativeDayUtc(-2).toISOString().substr(0, 10),
	};
};

export const status = async (ctx) => {
	let delay = Math.min(Math.max(Number(ctx.params.delay) || 0, 0), 180) * 1000;
	let status = Math.min(Math.max(Number(ctx.params.status) || 200, 100), 700);

	return Bluebird.delay(delay).then(() => {
		ctx.set('Cache-Control', `public, max-age=${Number(ctx.params.maxAge) || 0}`);
		ctx.status = status;
		ctx.body = ctx.headers;

		if (ctx.params.maxAge === 'none') {
			ctx.remove('Cache-Control');
		}
	});
};
