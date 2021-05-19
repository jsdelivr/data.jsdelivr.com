exports.up = async (db) => {
	await db('proxy').insert([
		{ path: '/esm' },
		{ path: '/pyodide' },
	]);
};

exports.down = () => {};
