global._ = require('lodash');
global.Promise = require('bluebird');

const fs = require('fs-extra');
const redis = require('redis');

Promise.promisifyAll(fs);
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

global.logger = require('./logger');
global.redis = require('./redis');
global.db = require('./db');
