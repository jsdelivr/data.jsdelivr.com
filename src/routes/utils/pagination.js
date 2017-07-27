module.exports = (limit, page) => {
	let l = Math.floor(limit);
	let p = Math.floor(page);

	if (!Number.isInteger(l) || l < 0 || l > 100) {
		l = 100;
	}

	if (!Number.isInteger(l) || p < 0) {
		p = 1;
	}

	return [ l, p ];
};
