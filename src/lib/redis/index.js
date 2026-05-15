import zlib from 'zlib';
import { createClient as createRedisClient, RESP_TYPES } from 'redis';
import config from 'config';

const redisConfig = config.get('redis');
const redisLog = logger.scope('redis');
const client = createClient();

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
	client.once('ready', () => client.flushAll().catch(() => {}));
}

if (process.env.NO_CACHE) {
	setInterval(() => {
		client.flushAll().catch(() => {});
	}, 1000);
}

async function compress (value) {
	value = String(value);

	// Don't compress if the data is less than 1024 bytes.
	if (value.length < 1024) {
		// Add a 0x00 byte as a flag for "not compressed".
		return '\x00' + value;
	}

	return zlib.deflateAsync(value);
}

async function decompress (value) {
	if (!value) {
		return value;
	} else if (value[0] === 0 || value.charCodeAt?.(0) === 0) {
		return Buffer.isBuffer(value) ? value.toString('utf8', 1) : value.substring(1);
	}

	return (await zlib.inflateAsync(value)).toString();
}

async function getCompressedAsync (key) {
	return this.decompress(await this.get(Buffer.from(key, 'utf8')));
}

async function setCompressedAsync (key, value, options) {
	return this.set(key, await this.compress(value), options);
}

function patchClient (client) {
	client.compress = compress;
	client.decompress = decompress;
	client.getCompressedAsync = getCompressedAsync;
	client.setCompressedAsync = setCompressedAsync;

	return client;
}

export function createClient () {
	let client = createRedisClient({
		database: redisConfig.db,
		password: redisConfig.password,
		socket: _.pickBy({
			host: redisConfig.host,
			port: Number(redisConfig.port) || undefined,
		}),
		disableOfflineQueue: true,
	}).withTypeMapping({
		[RESP_TYPES.BLOB_STRING]: Buffer, // needed for compressed cache and pub/sub values
	});

	client
		.on('ready', () => redisLog.debug('Connection ready.'))
		.on('reconnecting', info => redisLog.debug('Reconnecting.', _.pick(info, [ 'attempt', 'delay' ])))
		.on('error', error => redisLog.error('Connection error.', error));

	patchClient(client);
	client.connect().catch(() => {});

	return client;
}

export default client;
