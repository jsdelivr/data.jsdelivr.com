exports.up = async (db) => {
	await db('proxy').insert([
		{ name: 'atlas', path: '/atlas' },
		{ name: 'openwrt', path: '/openwrt/:type' },
		{ name: 'fontsource', path: '/fontsource' },
		{ name: 'yocto-sstate', path: '/yocto/sstate' },
	]);
};

exports.down = () => {};
