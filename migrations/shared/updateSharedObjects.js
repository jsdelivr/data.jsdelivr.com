const fs = require('fs');

module.exports = async (db) => {
	await db.schema.raw(fs.readFileSync(__dirname + '/events.sql', 'utf8'));
	await db.schema.raw(fs.readFileSync(__dirname + '/routines.sql', 'utf8'));
	await db.schema.raw(fs.readFileSync(__dirname + '/routines/platformViews.sql', 'utf8'));
	await db.schema.raw(fs.readFileSync(__dirname + '/routines/updateOrInsert.sql', 'utf8'));
	await db.schema.raw(fs.readFileSync(__dirname + '/views.sql', 'utf8'));
	await require('./routines')(db);
};
