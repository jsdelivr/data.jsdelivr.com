const redis = require('redis');
const config = require('config');
const redisConfig = config.get('redis');

module.exports = redis.createClient({
	db: redisConfig.db,
	host: redisConfig.host,
	port: redisConfig.port,
	auth_pass: redisConfig.password,
});

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
	module.exports.flushallAsync().catch(() => {});
}

if (process.env.NO_CACHE) {
	setInterval(() => {
		module.exports.flushallAsync().catch(() => {});
	}, 1000);
}
