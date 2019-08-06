const zlib = require('zlib');
const redis = require('redis');
const config = require('config');
const redisConfig = config.get('redis');
const redisLog = logger.scope('redis');

module.exports = createClient();
module.exports.createClient = createClient;

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
	module.exports.once('ready', () => module.exports.flushallAsync().catch(() => {}));
}

if (process.env.NO_CACHE) {
	setInterval(() => {
		module.exports.flushallAsync().catch(() => {});
	}, 1000);
}

redis.RedisClient.prototype.compress = async function (value) {
	value = String(value);

	// Don't compress if the data is less than 1024 bytes.
	if (value.length < 1024) {
		// Add a 0x00 byte as a flag for "not compressed".
		return '\x00' + value;
	}

	return zlib.deflateAsync(value);
};

redis.RedisClient.prototype.decompress = async function (value) {
	if (!value) {
		return value;
	} else if (value[0] === 0) {
		return value.toString('utf8', 1);
	}

	return (await zlib.inflateAsync(value)).toString();
};

redis.RedisClient.prototype.getCompressedAsync = async function (key) {
	return this.decompress(await this.getAsync(Buffer.from(key, 'utf8')));
};

redis.RedisClient.prototype.setCompressedAsync = async function (key, value, ...other) {
	return this.setAsync(key, await this.compress(value), ...other);
};

function createClient () {
	let client = redis.createClient({
		db: redisConfig.db,
		host: redisConfig.host,
		port: redisConfig.port,
		password: redisConfig.password,
		return_buffers: true, // needed for compressed pub/sub
		enable_offline_queue: false,
	});

	client
		.on('ready', () => redisLog.debug('Connection ready.'))
		.on('reconnecting', info => redisLog.debug('Reconnecting.', _.pick(info, [ 'attempt', 'delay' ])))
		.on('error', error => redisLog.error('Connection error.', error));

	return client;
}
