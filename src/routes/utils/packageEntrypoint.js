const PRIMARY_FIELDS = {
	js: [ 'jsdelivr', 'cdn', 'browser' ],
	css: [ 'jsdelivr', 'cdn', 'browser', 'style' ],
};

const FALLBACK_FIELDS = {
	js: [ 'main' ],
	css: [ 'main' ],
};

const normalizeFilename = (filename) => {
	return '/' + filename
		.replace(/^\//, '') // remove leading slash
		.replace(/\.min\.(js|css)$/i, '.$1') // normalize minified
		.replace(/\.(js|css)$/i, '.min.$1'); // convert to minified
};

const filterFields = (pkg, fields, extension) => {
	return filterFilesByExtension(fields[extension].map(field => pkg[field]), extension).map(file => ({ file }));
};

const filterFilesByExtension = (entries, extension) => {
	return entries.filter(entry => entry && entry.toLowerCase().endsWith(`.${extension.toLowerCase()}`));
};

const fromFields = (pkg, fields = PRIMARY_FIELDS) => {
	return [
		...filterFields(pkg, fields, 'js'),
		...filterFields(pkg, fields, 'css'),
	];
};

const fromFallbackFields = (fields) => {
	return fromFields(fields, FALLBACK_FIELDS);
};

const fromFiles = (fieldValues, files) => {
	files = files.map((entry) => {
		let file = normalizeFilename(entry.file);

		return {
			file,
			guessed: !!entry.guessed && !fieldValues.includes(file),
		};
	});

	return {
		js: responseByExtension(files, 'js'),
		css: responseByExtension(files, 'css'),
	};
};

const isReadyForResponse = (data) => {
	return data.js && data.css;
};

const resolve = async (pkg, sources) => {
	let result = {};
	let fieldValues = _.map(pkg, file => normalizeFilename(file));

	for (let source of sources) {
		_.defaults(result, fromFiles(fieldValues, await source()));

		if (isReadyForResponse(result)) {
			return result;
		}
	}

	return result;
};

const responseByExtension = (entries, extension) => {
	return entries.find(entry => entry.file.toLowerCase().endsWith(`.${extension.toLowerCase()}`));
};

module.exports = {
	fromFields,
	fromFallbackFields,
	resolve,
};
