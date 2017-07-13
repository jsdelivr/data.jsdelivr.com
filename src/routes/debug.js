const os = require('os');
const childProcess = require('child_process');
const config = require('config');
const version = require('../../package.json').version;
const serverConfig = config.get('server');
let commit = 'git not available';

try {
	commit = childProcess.execSync('git log -1 "--format=%cd - commit %H"', { encoding: 'utf8' });
} catch (e) {}

module.exports = async (ctx) => {
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
	};
};
