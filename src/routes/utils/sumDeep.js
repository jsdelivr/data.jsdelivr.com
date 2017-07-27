module.exports = function sumDeep (data, depth = 1) {
	return _.reduce(data, (sum, value) => {
		if (depth === 1) {
			return sum + value;
		}

		return sum + sumDeep(value, depth - 1);
	}, 0);
};
