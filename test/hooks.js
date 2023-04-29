process.env.NODE_ENV = 'test';

const nock = require('nock');
const chai = require('chai');
const config = require('config');

const serverConfig = config.get('server');
global.server = `http://127.0.0.1:${serverConfig.port}`;
global.log = logger.scope('test');

const expectAssert = require('expect-assert');
chai.expect = expectAssert(chai.expect);

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const chaiOas = require('./plugins/oas');
const chaiSnapshot = require('./plugins/snapshot');

global.chaiSnapshotInstance = chaiSnapshot({
	snapshotResponses: !!Number(process.env.SNAPSHOT_RESPONSES),
	updateExistingSnapshots: !!Number(process.env.UPDATE_EXISTING_SNAPSHOTS),
});

chai.use(chaiSnapshotInstance);

exports.mochaHooks = {
	async beforeAll () {
		chai.use(await chaiOas({ specPath: __dirname + '/../src/public/v1/spec.yaml' }));

		if (global.v8debug === undefined && !/--debug|--inspect/.test(process.execArgv.join(' ')) && !process.env.JB_IDE_PORT) {
			require('blocked')((ms) => {
				throw new Error(`Blocked for ${ms} ms.`);
			}, { threshold: 100 });
		}

		nock.disableNetConnect();
		nock.enableNetConnect('127.0.0.1');
	},
	afterAll () {
		if (Number(process.env.PRUNE_OLD_SNAPSHOTS)) {
			chaiSnapshotInstance.prune();
		} else if (Number(process.env.SNAPSHOT_RESPONSES) || Number(process.env.UPDATE_EXISTING_SNAPSHOTS)) {
			chaiSnapshotInstance.store();
		}
	},
};
