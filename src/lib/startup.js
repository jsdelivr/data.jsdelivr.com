import db from './db/index.js';
import logger from './logger/index.js';
import JSONPP from './jsonpp/index.js';
import { PromiseLockError } from './promise-lock/index.js';
import RemoteResource from '../remote-services/RemoteResource.js';
import NpmRemoteResource from '../remote-services/NpmRemoteResource.js';
import GitHubRemoteResource from '../remote-services/GitHubRemoteResource.js';
import JsDelivrRemoteResource from '../remote-services/JsDelivrRemoteResource.js';
import RemoteResourceSerializableError from '../remote-services/RemoteResourceSerializableError.js';

global.db = db;
global.log = logger.scope('global');

JSONPP.addConstructor(PromiseLockError);
JSONPP.addConstructor(RemoteResource);
JSONPP.addConstructor(NpmRemoteResource);
JSONPP.addConstructor(GitHubRemoteResource);
JSONPP.addConstructor(JsDelivrRemoteResource);
JSONPP.addConstructor(RemoteResourceSerializableError);
