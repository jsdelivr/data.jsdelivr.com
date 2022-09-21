exports.up = async (db) => {
	await db('proxy').insert([
		{ path: '/rawgit' },
		{ path: '/mdi' },
		{ path: '/ghost' },
	]);
};

exports.down = () => {};
