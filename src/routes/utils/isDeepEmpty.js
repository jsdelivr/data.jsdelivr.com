module.exports = function isDeepEmpty (body) {
	if (_.isEmpty(body)) {
		return true;
	} else if (Array.isArray(body)) {
		return body.every(item => isDeepEmpty(item));
	} else if (typeof body === 'object') {
		return Object.keys(body).every(key => key === 'links' || isDeepEmpty(body[key]));
	} else if (body === '[\n\t\n]') {
		return true; // Raw JSON array as string from BaseCacheModel#asRawArray().
	}

	return false;
};
