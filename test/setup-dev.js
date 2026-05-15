process.env.NODE_ENV = 'development';

import '../src/lib/startup.js';
import setupDb from './setup-db.js';

(async () => {
	await setupDb({ databaseDate: new Date().toISOString().substr(0, 10) });
})().then(() => process.exit()).catch(console.error);
