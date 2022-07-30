module.exports.toIsoDate = (date) => {
	return date.toISOString().substr(0, 10);
};

module.exports.toIsoMonth = (date) => {
	return date.toISOString().substr(0, 7);
};

module.exports.toIsoYear = (date) => {
	return date.toISOString().substr(0, 4);
};
