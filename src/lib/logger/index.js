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

const writers = process.env.NODE_ENV === 'production' ? [
	new Logger.ConsoleWriter(process.env.LOG_LEVEL || Logger.levels.info),
	new ElasticWriter(process.env.LOG_LEVEL || Logger.levels.info, { esClient, apmClient }),
] : [
	new Logger.ConsoleWriter(process.env.LOG_LEVEL || Logger.levels.trace),
];

export default new Logger('jsdelivr-api', writers);
