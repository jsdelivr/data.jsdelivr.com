import { dirname } from 'path';
import { fileURLToPath } from 'url';

import nock from 'nock';
import chai from 'chai';
import config from 'config';

const serverConfig = config.get('server');
global.server = `http://127.0.0.1:${serverConfig.port}`;

import expectAssert from 'expect-assert';
chai.expect = expectAssert(chai.expect);

import chaiHttp from 'chai-http';
chai.use(chaiHttp);

import chaiOas from './plugins/oas/index.js';
import chaiSnapshot from './plugins/snapshot/index.js';

global.chaiSnapshotInstance = chaiSnapshot({
	snapshotResponses: !!Number(process.env.SNAPSHOT_RESPONSES),
	updateExistingSnapshots: !!Number(process.env.UPDATE_EXISTING_SNAPSHOTS),
});

chai.use(chaiSnapshotInstance);

export const mochaHooks = {
	async beforeAll () {
		global.log = logger.scope('test');
		chai.use(await chaiOas({ specPath: dirname(fileURLToPath(import.meta.url)) + '/../src/public/v1/spec.yaml' }));

		if (global.v8debug === undefined && !/--debug|--inspect/.test(process.execArgv.join(' ')) && !process.env.JB_IDE_PORT) {
			let { default: blocked } = await import('blocked');

			blocked((ms) => {
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
