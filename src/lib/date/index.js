export const toIsoDate = (date) => {
	return date.toISOString().substr(0, 10);
};

export const toIsoMonth = (date) => {
	return date.toISOString().substr(0, 7);
};

export const toQuarter = (date) => {
	return `${date.toISOString().substr(0, 4)}-Q${Math.ceil((date.getUTCMonth() + 1) / 3)}`;
};

export const toIsoYear = (date) => {
	return date.toISOString().substr(0, 4);
};
