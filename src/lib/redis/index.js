const zlib = require('zlib');
const redis = require('redis');
const config = require('config');
const redisConfig = config.get('redis');

module.exports = redis.createClient({
	db: redisConfig.db,
	host: redisConfig.host,
	port: redisConfig.port,
	auth_pass: redisConfig.password,
	detect_buffers: true,
});

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
	module.exports.flushallAsync().catch(() => {});
}

if (process.env.NO_CACHE) {
	setInterval(() => {
		module.exports.flushallAsync().catch(() => {});
	}, 1000);
}

redis.RedisClient.prototype.getCompressedAsync = async function (key) {
	let value = await this.getAsync(new Buffer(key, 'utf8'));

	if (!value) {
		return value;
	}

	return (await zlib.inflateAsync(value)).toString();
};

redis.RedisClient.prototype.setCompressedAsync = async function (key, value, ...other) {
	return this.setAsync(key, await zlib.deflateAsync(value), ...other);
};
