const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await db.schema.createTable('_logs', (table) => {
		table.bigIncrements();
		table.string('name');
		table.string('arguments');
		table.datetime('startedAt');
		table.time('duration');
		table.index([ 'startedAt', 'name' ]);
		table.index([ 'name', 'startedAt' ]);
	});

	// language=MariaDB
	await db.schema.raw(`
		create or replace view _view_logs as
		select name, date(startedAt) as date, sec_to_time(sum(time_to_sec(duration))) as duration
		from _logs
		group by name, date(startedAt)
		order by date desc, duration desc;
	`);

	await updateSharedObjects(db);
};

exports.down = () => {};
