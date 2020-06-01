exports.up = async (db) => {
	await db('proxy').insert([
		{ path: '/www.jsdelivr.com' },
	]);
};

exports.down = () => {};
