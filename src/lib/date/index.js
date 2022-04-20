module.exports.toIsoDate = (date) => {
	return date.toISOString().substr(0, 10);
};
