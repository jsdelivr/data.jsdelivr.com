# WORK IN PROGRESS
# jsDelivr API

https://data.jsdelivr.com/v1

The jsDelivr API allows you to:
 - [list package versions](#list-package-versions)
 - [list package files](#list-package-files)
 - [resolve version range](#resolve-version-range)
 - [get package usage stats](#get-package-usage-stats)
 - [get package version usage stats](#get-package-version-usage-stats)
 - [get the most popular packages](#get-the-most-popular-packages)
 - [get a badge for your project](#get-a-badge-for-your-project)
 
The API is free to use and imposes no rate limits.
Please note that usage statistics are available with a 48 hour delay
and data older than one year may not be available.

## Endpoints

 - All responses are in JSON.
 - All error responses have `status` and `message` properties.
 - Additional [query string options](#query-string-options) are supported where appropriate.

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
/package/npm/:name@:version
 - name: npm package name
 - version: exact package version (not a version range)
 
/package/gh/:user/:repo@:version
 - user: GitHub username
 - repo: GitHub repository name
 - version: exact package version (not a version range)
```

**Example**
```
https://data.jsdelivr.com/v1/package/npm/jquery@3.2.1

// =>
{
    "default": "/dist/jquery.min.js",
    "files": [
        {
            "name": "/AUTHORS.txt",
            "size": 11218,
            "time": "2017-03-20T19:01:15.000Z"
        },
        {
            "name": "/bower.json",
            "size": 190,
            "time": "2017-03-20T19:01:15.000Z"
        },
        {
            "name": "/dist/core.js",
            "size": 11197,
            "time": "2017-03-20T19:01:15.000Z"
        },
        ...
    ]
}
```

### Resolve version range

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
    "rank": 7, // number of packages with more hits
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
    }
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
 - version: exact package version (not a version range)
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
![](https://data.jsdelivr.com/v1/package/npm/jquery/badge)

```
https://data.jsdelivr.com/v1/package/npm/jquery/badge?style=rounded
```
![](https://data.jsdelivr.com/v1/package/npm/jquery/badge?style=rounded)

## Query string options

All invalid values are ignored.

| Description            	| Format             	| Notes                         	|
|------------------------	|--------------------	|-------------------------------	|
| Start date (inclusive) 	| `?from=YYYY-MM-DD` 	| 						          	|
| End date (inclusive)   	| `?to=YYYY-MM-DD`   	| 						          	|
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

Additionally, opbeat token should be set via `OPBEAT_TOKEN` variable, and Trace token via `TRACE_API_KEY`, and `NODE_ENV=production`.
