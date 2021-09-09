exports.up = async (db) => {
	await db('proxy').insert([
		{ path: '/rawgit' },
		{ path: '/mdi' },
	]);
};

exports.down = () => {};
