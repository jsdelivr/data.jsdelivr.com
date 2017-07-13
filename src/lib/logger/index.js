const bunyan = require('bunyan');
const PrettyStream = require('bunyan-prettystream');
const path = require('path');
const fs = require('fs-extra');
const config = require('config');
const loggerConfig = config.get('logger');

fs.ensureDirSync(loggerConfig.path);

const prettyStream = new PrettyStream();
prettyStream.pipe(process.stdout);

class FileStream extends fs.WriteStream {
	constructor (filePath) {
		super(filePath, { flags: 'a', encoding: 'utf8' });
	}

	write (record) {
		try {
			if (record.err) {
				record = _.assign({}, record, { err: bunyan.stdSerializers.err(record.err) });
			}

			super.write(JSON.stringify(record, bunyan.safeCycles()) + '\n');
		} catch (e) {
			console.error(`Error in JSON.stringify()`, e, record);
		}
	}
}

class OpbeatStream {
	write (record) {
		if (record.level >= bunyan.ERROR) {
			global.OPBEAT_CLIENT.setExtraContext(_.assign({
				level: OpbeatStream.levels[record.level],
			}, _.omit(record, [ 'err', 'level', 'name', 'req', 'v' ])));

			global.OPBEAT_CLIENT.captureError(record.err);
		} else {
			global.OPBEAT_CLIENT.setExtraContext(_.assign({
				level: OpbeatStream.levels[record.level],
			}, _.omit(record, [ 'level', 'name', 'v' ])));
		}
	}
}

OpbeatStream.levels = {
	[bunyan.TRACE]: 'debug',
	[bunyan.DEBUG]: 'debug',
	[bunyan.INFO]: 'info',
	[bunyan.WARN]: 'warning',
	[bunyan.ERROR]: 'error',
	[bunyan.FATAL]: 'fatal',
};

module.exports = bunyan.createLogger({
	name: 'app-log',
	streams: process.env.NODE_ENV === 'development' ? [
		{ level: bunyan.TRACE, type: 'raw', stream: prettyStream },
	] : [
		{ level: bunyan.TRACE, type: 'raw', stream: new FileStream(path.join(loggerConfig.path, process.pid + '.log')) },
		{ level: bunyan.TRACE, type: 'raw', stream: new OpbeatStream() },
	],
	serializers: _.defaults({
		err (err) {
			return err;
		},
	}, bunyan.stdSerializers),
});
