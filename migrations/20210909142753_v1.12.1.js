export const up = async (db) => {
	await db('proxy').insert([
		{ path: '/rawgit' },
		{ path: '/mdi' },
		{ path: '/ghost' },
	]);
};

export const down = () => {};
