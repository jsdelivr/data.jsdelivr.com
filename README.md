# jsDelivr API

Related projects:
 - [jsDelivr CDN](https://github.com/jsdelivr/jsdelivr)
 - [jsDelivr website](https://github.com/jsdelivr/www.jsdelivr.com)

The API is free to use and imposes no rate limits. However, if you plan to make 100+ RPM for longer periods of time, you should contact us first.
Please note that usage statistics are available with a 48 hour delay.
We only have data starting from Aug 19, 2017 and data older than one year may not be available.

## Let us know how you use this API

**If you create a tool/plugin/etc. which uses this API, please include a link to your tool in the `User-Agent` header so that we can learn more about how this API is being used.**

## Restrictions

Neither jsDelivr CDN nor this API supports packages larger than 50 MB for GitHub and 100 MB for npm. Trying to get a list of files using the API will result in a `403` response.

## Endpoints

See the [documentation](https://www.jsdelivr.com/docs/data.jsdelivr.com)
or download the [OpenAPI spec file](https://data.jsdelivr.com/v1/spec.yaml).

## FAQ

### Search npm packages

There is no search endpoint in this API because there are already two other APIs for that:
 - [the official npm API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#get-v1search)
 - [Algolia's npm search](https://github.com/algolia/npm-search) ([more info](https://github.com/jsdelivr/data.jsdelivr.com/issues/6))

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
        db: 'REDIS_DB', // defaults to 0
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

Additionally, `ELASTIC_APM_SERVER_URL`, `ELASTIC_APM_SECRET_TOKEN`, `ELASTIC_SEARCH_URL` (including user + pass), and `NODE_ENV=production` should be set.
