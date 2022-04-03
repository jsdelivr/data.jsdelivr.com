process.env.NODE_ENV = 'test';

const nock = require('nock');
const config = require('config');
const chai = require('chai');
const serverConfig = config.get('server');

global.server = `http://127.0.0.1:${serverConfig.port}`;

const afterEachCallbacks = [];

// expect-assert doesn't work with root hooks yet so we need to polyfill the required interface.
global.afterEach = function afterEach (...args) {
	afterEachCallbacks.push(args);
};

chai.expect = require('expect-assert')(chai.expect);

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
	afterEach () {
		afterEachCallbacks.forEach(([ , cb ]) => {
			cb.call(this);
		});
	},
};
