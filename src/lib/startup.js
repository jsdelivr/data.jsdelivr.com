import Logger from 'h-logger2';
import apmClient from 'elastic-apm-node';
import ElasticWriter from 'h-logger2-elastic';
import { Client as ElasticSearch } from '@elastic/elasticsearch';

let esClient;

if (process.env.ELASTIC_SEARCH_URL) {
	esClient = new ElasticSearch({
		node: process.env.ELASTIC_SEARCH_URL,
	});
}

global.logger = new Logger(
	'jsdelivr-api',
	process.env.NODE_ENV === 'production' ? [
		new Logger.ConsoleWriter(process.env.LOG_LEVEL || Logger.levels.info),
		new ElasticWriter(process.env.LOG_LEVEL || Logger.levels.info, { esClient, apmClient }),
	] : [
		new Logger.ConsoleWriter(process.env.LOG_LEVEL || Logger.levels.trace),
	],
);

global.log = logger.scope('global');

const { default: db } = await import('./db/index.js');
global.db = db;

const { default: JSONPP } = await import('./jsonpp/index.js');
const { PromiseLockError } = await import('./promise-lock/index.js');
const { default: RemoteResource } = await import('../remote-services/RemoteResource.js');
const { default: NpmRemoteResource } = await import('../remote-services/NpmRemoteResource.js');
const { default: GitHubRemoteResource } = await import('../remote-services/GitHubRemoteResource.js');
const { default: JsDelivrRemoteResource } = await import('../remote-services/JsDelivrRemoteResource.js');
const { default: RemoteResourceSerializableError } = await import('../remote-services/RemoteResourceSerializableError.js');

JSONPP.addConstructor(PromiseLockError);
JSONPP.addConstructor(RemoteResource);
JSONPP.addConstructor(NpmRemoteResource);
JSONPP.addConstructor(GitHubRemoteResource);
JSONPP.addConstructor(JsDelivrRemoteResource);
JSONPP.addConstructor(RemoteResourceSerializableError);
