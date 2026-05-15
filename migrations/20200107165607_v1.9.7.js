export const up = async (db) => {
	await db('proxy').insert([
		{ path: '/www.jsdelivr.com/:hash' },
	]);
};

export const down = () => {};
