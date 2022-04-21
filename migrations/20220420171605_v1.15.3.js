const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await db.schema.createTable(`view_top_packages`, (table) => {
		table.enum('period', [ 'day', 'week', 'month', 'year', 'all' ]);
		table.date('date');
		table.string('type');
		table.string('name');
		table.integer('hitsRank').unsigned();
		table.integer('hitsTypeRank').unsigned();
		table.bigInteger('hits').unsigned().defaultTo(0).notNullable();
		table.integer('bandwidthRank').unsigned();
		table.integer('bandwidthTypeRank').unsigned();
		table.bigInteger('bandwidth').unsigned().defaultTo(0).notNullable();
		table.integer('prevHitsRank').unsigned();
		table.integer('prevHitsTypeRank').unsigned();
		table.bigInteger('prevHits').unsigned().defaultTo(0).notNullable();
		table.integer('prevBandwidthRank').unsigned();
		table.integer('prevBandwidthTypeRank').unsigned();
		table.bigInteger('prevBandwidth').unsigned().defaultTo(0).notNullable();
		table.primary([ 'period', 'date', 'type', 'name' ]);
		table.index([ 'period', 'date', 'type', 'hits' ]);
		table.index([ 'period', 'date', 'hits' ]);
		table.index([ 'period', 'date', 'type', 'bandwidth' ]);
		table.index([ 'period', 'date', 'bandwidth' ]);
	});
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
