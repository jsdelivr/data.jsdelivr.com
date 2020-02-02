global._ = require('lodash');
global.Bluebird = require('bluebird');

const Logger = require('h-logger2');
const ElasticWriter = require('h-logger2-elastic');
const ElasticSearch = require('@elastic/elasticsearch').Client;
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
		new ElasticWriter(process.env.LOG_LEVEL || Logger.levels.info, { esClient, apmClient: global.apmClient }),
	] : [
		new Logger.ConsoleWriter(process.env.LOG_LEVEL || Logger.levels.trace),
	]
);

global.log = logger.scope('global');

const fs = require('fs-extra');
const zlib = require('zlib');
const redis = require('redis');

Bluebird.promisifyAll(fs);
Bluebird.promisifyAll(zlib);
Bluebird.promisifyAll(redis.RedisClient.prototype);
Bluebird.promisifyAll(redis.Multi.prototype);

global.redis = require('./redis');
global.db = require('./db');

const JSONPP = require('./jsonpp');
JSONPP.addConstructor(require('./promise-lock').PromiseLockError);
