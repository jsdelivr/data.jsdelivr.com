process.env.NODE_ENV = 'development';

require('../src/lib/startup');
const setupDb = require('./setup-db');

(async () => {
	await setupDb({ databaseDate: new Date().toISOString().substr(0, 10) });
})().then(() => process.exit()).catch(console.error);
