const fs = require('fs');
const sql = fs.readFileSync(__filename + '.sql', 'utf8');

exports.up = async (db) => {
	await db.schema.alterTable('logs', (table) => {
		table.bigInteger('records').alter();
		table.bigInteger('megabytesLogs').alter();
		table.bigInteger('megabytesTraffic').alter();
	});

	await db.schema.alterTable('other_hits', (table) => {
		table.bigInteger('hits').alter();
	});

	await db.schema.raw(sql);
};

exports.down = () => {};
