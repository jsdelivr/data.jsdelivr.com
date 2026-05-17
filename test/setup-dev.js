process.env.NODE_ENV = 'development';

(async () => {
	await import('../src/lib/startup.js');
	let { default: setupDb } = await import('./setup-db.js');

	await setupDb({ databaseDate: new Date().toISOString().substr(0, 10) });
})().then(() => process.exit()).catch(console.error);
