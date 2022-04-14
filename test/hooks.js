process.env.NODE_ENV = 'test';

const path = require('path');
const nock = require('nock');
const chai = require('chai');
const config = require('config');

const serverConfig = config.get('server');
global.server = `http://127.0.0.1:${serverConfig.port}`;

const expectAssert = require('expect-assert');
chai.expect = expectAssert(chai.expect);

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const chaiSnapshot = require('./plugins/snapshot');
chai.use(chaiSnapshot({
	path (file) {
		return path.join(
			__dirname,
			'expected',
			path.relative(path.join(__dirname, 'tests'), path.dirname(file)),
			`${path.basename(file, path.extname(file))}.json`
		);
	},
}));

exports.mochaHooks = {
	before () {
		if (global.v8debug === undefined && !/--debug|--inspect/.test(process.execArgv.join(' ')) && !process.env.JB_IDE_PORT) {
			require('blocked')((ms) => {
				throw new Error(`Blocked for ${ms} ms.`);
			}, { threshold: 100 });
		}

		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');
	},
};
