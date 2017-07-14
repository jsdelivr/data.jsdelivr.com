# jsDelivr API

## Production config

```js
module.exports = {
	server: {
		port: 'SERVER_PORT', // defaults to 4454
		debugToken: 'SERVER_DEBUG_TOKEN' // The debug endpoint will be available at /debug/SERVER_DEBUG_TOKEN
	},
	db: {
		connection: {
			host: 'DB_CONNECTION_HOST', // defaults to localhost
			port: 'DB_CONNECTION_PORT', // defaults to 3306
			user: 'DB_CONNECTION_USER',
			password: 'DB_CONNECTION_PASSWORD',
			database: 'DB_CONNECTION_DATABASE', // defaults to jsdelivr-stats
		},
	},
	redis: {
		host: 'REDIS_HOST',
		port: 'REDIS_PORT',
		password: 'REDIS_PASSWORD',
	},
	v1: {
		gh: {
			apiToken: 'V_1_GH_API_TOKEN',
		},
	},
}
```

Additionally, opbeat token should be set via `OPBEAT_TOKEN` variable, and Trace token via `TRACE_API_KEY`, and `NODE_ENV=production`.
