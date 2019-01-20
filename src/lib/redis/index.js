const zlib = require('zlib');
const redis = require('redis');
const config = require('config');
const redisConfig = config.get('redis');
const redisLog = logger.scope('redis');

module.exports = createClient();
module.exports.createClient = createClient;

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
	module.exports.flushallAsync().catch(() => {});
}

if (process.env.NO_CACHE) {
	setInterval(() => {
		module.exports.flushallAsync().catch(() => {});
	}, 1000);
}

redis.RedisClient.prototype.getCompressedAsync = async function (key) {
	let value = await this.getAsync(Buffer.from(key, 'utf8'));

	if (!value) {
		return value;
	}

	return (await zlib.inflateAsync(value)).toString();
};

redis.RedisClient.prototype.setCompressedAsync = async function (key, value, ...other) {
	return this.setAsync(key, await zlib.deflateAsync(value), ...other);
};

function createClient () {
	let client = redis.createClient({
		db: redisConfig.db,
		host: redisConfig.host,
		port: redisConfig.port,
		password: redisConfig.password,
		detect_buffers: true,
		enable_offline_queue: false,
	});

	client
		.on('ready', () => redisLog.debug('Connection ready.'))
		.on('reconnecting', info => redisLog.debug('Reconnecting.', _.pick(info, [ 'attempt', 'delay' ])))
		.on('error', error => redisLog.error('Connection error.', error));

	return client;
}
