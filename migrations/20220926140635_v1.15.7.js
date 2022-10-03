const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await db.schema.createTable(`proxy_file`, (table) => {
		table.increments();
		table.integer('proxyId').unsigned().references('id').inTable('proxy').onUpdate('cascade').onDelete('cascade');
		table.string('filename');
		table.unique([ 'proxyId', 'filename' ]);
	});

	await db.schema.createTable(`proxy_file_hits`, (table) => {
		table.integer('proxyFileId').unsigned().references('id').inTable('proxy_file').onUpdate('cascade').onDelete('cascade');
		table.date('date');
		table.integer('hits').unsigned().defaultTo(0);
		table.bigint('bandwidth').unsigned().defaultTo(0);
		table.primary([ 'proxyFileId', 'date' ]);
	});

	await updateSharedObjects(db);
};

exports.down = () => {};
