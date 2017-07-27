module.exports = (limit, page) => {
	let l = Number(limit);
	let p = Number(page);

	if (!Number.isInteger(l) || l < 0 || l > 100) {
		l = 100;
	}

	if (!Number.isInteger(p) || p < 0) {
		p = 1;
	}

	return [ l, p ];
};
