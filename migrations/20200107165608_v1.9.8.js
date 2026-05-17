export const up = async (db) => {
	await db('proxy').insert([
		{ path: '/esm' },
		{ path: '/pyodide' },
	]);
};

export const down = () => {};
