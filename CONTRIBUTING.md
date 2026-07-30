# Contributing Guide

Hi! We're really excited that you're interested in contributing to data.jsdelivr.com! Before submitting your contribution, please read through the following guide.

## Overview

-   Bug fixes and changes discussed in the existing issues are always welcome.
-   For new ideas, please open an issue to discuss them before sending a PR.
-   Make sure your PR passes `npm test` and has [appropriate commit messages](https://github.com/jsdelivr/data.jsdelivr.com/commits/master).

## Repo Setup

To get started, you need to have Node.js 22 or 24 and Docker Compose; run `docker compose up -d --wait` to start MariaDB 11.8 and Redis.

The default configuration file is `config/default.cjs`. To change any of the default values, either:
- create a file `config/local.cjs` with the necessary changes; the options set in this file will be merged with `config/default.cjs` so `config/local.cjs` should only contain options that you actually changed,
- use environment variables.

Run the following commands:

```bash
npm install # install dependencies
npm run migrate # setup the database
npm run start:dev # start the app
```

Configuration for IntelliJ based IDEs is also available in this repository. If you use one, it is a good idea to add https://github.com/MartinKolarik/idea-config as a [read-only settings repository](https://www.jetbrains.com/help/idea/sharing-your-ide-settings.html#share-more-settings-through-read-only-repo). It contains code style and inspection profiles used by this project.

## Testing

-   JS code style: `npm run lint:js`
-   OpenAPI docs style: `npm run lint:docs`
-   Unit and integration tests: `npm run test:mocha`
-   Contract tests: `npm run test:portman`
-   All combined: `npm test`

Most IDEs have plugins integrating the used linter (eslint), including support for automated fixes on save.

## Production Configuration

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
