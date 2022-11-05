module.exports.toIsoDate = (date) => {
	return date.toISOString().substr(0, 10);
};

module.exports.toIsoMonth = (date) => {
	return date.toISOString().substr(0, 7);
};

module.exports.toQuarter = (date) => {
	return `${date.toISOString().substr(0, 4)}-Q${Math.ceil((date.getUTCMonth() + 1) / 3)}`;
};

module.exports.toIsoYear = (date) => {
	return date.toISOString().substr(0, 4);
};
