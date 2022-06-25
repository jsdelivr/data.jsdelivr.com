const updateSharedObjects = require('./shared/updateSharedObjects');

exports.up = async (db) => {
	await updateSharedObjects(db);
};

exports.down = () => {};
