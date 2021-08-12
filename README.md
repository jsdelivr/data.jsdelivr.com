# jsDelivr API

[![Build Status](https://img.shields.io/travis/jsdelivr/data.jsdelivr.com.svg?style=flat-square)](https://travis-ci.org/jsdelivr/data.jsdelivr.com)
[![dependencies](https://img.shields.io/david/jsdelivr/data.jsdelivr.com.svg?style=flat-square)](https://david-dm.org/jsdelivr/data.jsdelivr.com)
[![devDependencies](https://img.shields.io/david/dev/jsdelivr/data.jsdelivr.com.svg?style=flat-square)](https://david-dm.org/jsdelivr/data.jsdelivr.com?type=dev)

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

https://data.jsdelivr.com/v1

 - All responses are in JSON.
 - All error responses have `status` and `message` properties.
 - Additional [query string options](#query-string-options) are supported where appropriate.

The jsDelivr API allows you to:
 - [list package versions](#list-package-versions)
 - [list package files](#list-package-files)
 - [resolve a version range](#resolve-a-version-range)
 - [resolve package entry points](#resolve-package-entry-points)
 - [get package usage stats](#get-package-usage-stats)
 - [get package version usage stats](#get-package-version-usage-stats)
 - [get the most popular packages](#get-the-most-popular-packages)
 - [get a hits badge for your project](#get-a-badge-for-your-project)
 - [get a rank badge for your project](#get-a-rank-badge-for-your-project)
 - [get a CDN link/metadata from file hash](#get-a-cdn-linkmetadata-from-file-hash)
 - [search npm packages](#search-npm-packages)

### List package versions

```
/package/npm/:name
 - name: npm package name

/package/gh/:user/:repo
 - user: GitHub username
 - repo: GitHub repository name
```

**Example**
```
https://data.jsdelivr.com/v1/package/npm/jquery

// =>
{
    "tags": {
        "beta": "3.2.1",
        "latest": "3.2.1"
    },
    "versions": [
        "3.2.1",
        "3.2.0",
        "3.1.1",
        ...
    ]
}
```

### List package files

```
/package/npm/:name@:version/:structure?
 - name: npm package name
 - version: exact package version (not a version range)
 - structure: "tree" or "flat"; defaults to "tree"

/package/gh/:user/:repo@:version/:structure?
 - user: GitHub username
 - repo: GitHub repository name
 - version: exact package version (not a version range) or a commit hash
 - structure: "tree" or "flat"; defaults to "tree"
```

**Example**
```
https://data.jsdelivr.com/v1/package/npm/jquery@3.2.1

// =>
{
    "default": "/dist/jquery.min.js",
    "files": [
        {
            "type": "directory",
            "name": "dist",
            "files": [
                {
                    "type": "file",
                    "name": "core.js",
                    "hash": "BSsbXsDErniq/HpuhULFor8x1CpA2sPPwQLlEoEri+0=", // base64-encoded sha256
                    "time": "2017-03-20T19:01:15.000Z",
                    "size": 11197
                },
                {
                    "type": "file",
                    "name": "jquery.js",
                    "hash": "DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE=",
                    "time": "2017-03-20T19:01:15.000Z",
                    "size": 268039
                },
                {
                    "type": "file",
                    "name": "jquery.min.js",
                    "hash": "hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=",
                    "time": "2017-03-20T19:01:15.000Z",
                    "size": 86659
                },
                ...
            ]
        },
        ...
    ]
}
```

### Resolve a version range

```
/package/resolve/npm/:name@:range
 - name: npm package name
 - range: any valid semver version range

/package/resolve/gh/:user/:repo@:range
 - user: GitHub username
 - repo: GitHub repository name
 - range: any valid semver version range
```

**Example**
```
https://data.jsdelivr.com/v1/package/resolve/npm/jquery@3

// =>
{
    "version": "3.2.1"
}
```

### Resolve package entry points

```
/package/npm/:name@:version/entrypoints
 - name: npm package name
 - version: exact package version (not a version range)
```

Based on package metadata and additional heuristics, returns the recommended files to use from this package. The response includes one file of each supported type (js, css), if available.

Each resolved entry point contains:

- `file` - resolved file path
- `guessed` - a flag that indicates how the entrypoint was resolved
	- `false` - based on trusted package metadata
	- `true` - based on our heuristics

The output of this endpoint may change over time as our algorithm improves.

**Example**

```
https://data.jsdelivr.com/v1/package/npm/bootstrap@5.1.0/entrypoints

// =>
{
    "js": {
        "file": "/dist/js/bootstrap.min.js",
        "guessed": false
    },
    "css": {
        "file": "/dist/css/bootstrap.min.css",
        "guessed": false
    }
}
```

### Get package usage stats

```
/package/npm/:name/stats/:groupBy?/:period?
 - name: npm package name
 - groupBy: "version" or "date"; defaults to "version"
 - period: "day", "week", "month", or "year"; defaults to "month"

/package/gh/:user/:repo/stats/:groupBy?/:period?
 - user: GitHub username
 - repo: GitHub repository name
 - groupBy: "version" or "date"; defaults to "version"
 - period: "day", "week", "month", or "year"; defaults to "month"
```

**Example**
```
https://data.jsdelivr.com/v1/package/npm/jquery/stats

// =>
{
    "rank": 7, // number of packages with more hits; null if the package doesn't have any hits
    "total": 122152394,
    "versions": {
        "2.2.4": {
            "total": 39473984,
            "dates": {
                "2017-07-16": 2013667,
                "2017-07-17": 4136315,
                "2017-07-18": 4006439,
                ...
            }
        },
        "3.0.0-rc1": {
            "total": 14547754,
            "dates": {
                "2017-07-16": 891674,
                "2017-07-17": 1852922,
                "2017-07-18": 1571811,
                ...
            }
        },
        ...
    },
    "commits": {} // same structure as "versions"; always empty for npm packages
}
```

### Get package version usage stats

```
/package/npm/:name@:version/stats/:groupBy?/:period?
 - name: npm package name
 - version: exact package version (not a version range)
 - groupBy: "file" or "date"; defaults to "file"
 - period: "day", "week", "month", or "year"; defaults to "month"

/package/gh/:user/:repo@:version/stats/:groupBy?/:period?
 - user: GitHub username
 - repo: GitHub repository name
 - version: exact package version (not a version range) or a commit hash
 - groupBy: "file" or "date"; defaults to "file"
 - period: "day", "week", "month", or "year"; defaults to "month"
```

**Example**
```
https://data.jsdelivr.com/v1/package/npm/jquery@3.2.1/stats

// =>
{
    "total": 837129,
    "files": {
        "/dist/jquery.js": {
            "total": 987,
            "dates": {
                "2017-07-16": 19,
                "2017-07-17": 108,
                "2017-07-18": 84,
                "2017-07-19": 158,
                ...
            }
        },
        "/dist/jquery.min.js": {
            "total": 732301,
            "dates": {
                "2017-07-16": 25844,
                "2017-07-17": 72004,
                "2017-07-18": 70519,
                ...
            }
        },
        ...
    }
}
```

### Get the most popular packages

```
/stats/packages/:period?
 - period: "day", "week", "month", or "year"; defaults to "month"
```

**Example**
```
https://data.jsdelivr.com/v1/stats/packages

// =>
[
    {
        "hits": 552050612,
        "type": "npm",
        "name": "slick-carousel"
    },
    {
        "hits": 414990868,
        "type": "npm",
        "name": "webshim"
    },
    {
        "hits": 219178863,
        "type": "npm",
        "name": "emojione"
    },
    ...
]
```

### Get a badge for your project

```
/package/npm/:name/badge/:period?
 - name: npm package name
 - period: "day", "week", "month", or "year"; defaults to "month"

/package/gh/:user/:repo/badge/:period?
 - user: GitHub username
 - repo: GitHub repository name
 - period: "day", "week", "month", or "year"; defaults to "month"
```

**Example**
```
https://data.jsdelivr.com/v1/package/npm/jquery/badge
```
![https://www.jsdelivr.com/package/npm/jquery](https://data.jsdelivr.com/v1/package/npm/jquery/badge)

```
https://data.jsdelivr.com/v1/package/npm/jquery/badge?style=rounded
```
![https://www.jsdelivr.com/package/npm/jquery](https://data.jsdelivr.com/v1/package/npm/jquery/badge?style=rounded)

### Get a rank badge for your project

```
/package/npm/:name/badge/rank/:period?
 - name: npm package name
 - period: "day", "week", "month", or "year"; defaults to "month"

/package/gh/:user/:repo/badge/rank/:period?
 - user: GitHub username
 - repo: GitHub repository name
 - period: "day", "week", "month", or "year"; defaults to "month"
```

**Example**
```
https://data.jsdelivr.com/v1/package/npm/jquery/badge/rank
```
![https://www.jsdelivr.com/package/npm/jquery](https://data.jsdelivr.com/v1/package/npm/jquery/badge/rank)

```
https://data.jsdelivr.com/v1/package/npm/jquery/badge?style=rounded
```
![https://www.jsdelivr.com/package/npm/jquery](https://data.jsdelivr.com/v1/package/npm/jquery/badge/rank?style=rounded)

### Get a CDN link/metadata from file hash

```
/lookup/hash/:hash
 - hash: hex-encoded sha256 of file contents
```

Works only for files which were accessed at least once via our CDN. If there are multiple
files with the same hash, the one which was accessed first via the CDN is returned.


**Example**
```
https://data.jsdelivr.com/v1/lookup/hash/87083882cc6015984eb0411a99d3981817f5dc5c90ba24f0940420c5548d82de

// =>
{
    "type": "npm",
    "name": "jquery",
    "version": "3.2.1",
    "file": "/dist/jquery.min.js"
}
```

### Search npm packages

There is no search endpoint in this API because there are already two other APIs for that:
 - [the official npm API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#get-v1search)
 - [Algolia's npm search](https://github.com/algolia/npm-search) ([more info](https://github.com/jsdelivr/data.jsdelivr.com/issues/6))

## Query string options

All invalid values are ignored.

| Description            	| Format             	| Notes                         	|
|------------------------	|--------------------	|-------------------------------	|
| Limit                  	| `?limit=number`    	| 						max 100 	|
| Page                   	| `?page=number`      	| 						        	|

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
