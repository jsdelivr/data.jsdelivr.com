import { fileURLToPath } from 'url';

import nock from 'nock';
import chai from 'chai';
import config from 'config';
import expectAssert from 'expect-assert';
import chaiHttp from 'chai-http';
import chaiOas from './plugins/oas/index.js';
import chaiSnapshot from './plugins/snapshot/index.js';

const serverConfig = config.get('server');
global.server = `http://127.0.0.1:${serverConfig.port}`;
chai.expect = expectAssert(chai.expect);

chai.use(chaiHttp);

global.chaiSnapshotInstance = chaiSnapshot({
	snapshotResponses: !!Number(process.env.SNAPSHOT_RESPONSES),
	updateExistingSnapshots: !!Number(process.env.UPDATE_EXISTING_SNAPSHOTS),
});

chai.use(chaiSnapshotInstance);

export const mochaHooks = {
	async beforeAll () {
		chai.use(await chaiOas({ specPath: fileURLToPath(new URL('../src/public/v1/spec.yaml', import.meta.url)) }));

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
