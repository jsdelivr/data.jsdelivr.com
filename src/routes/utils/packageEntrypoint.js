import _ from 'lodash';

const PRIMARY_FIELDS = {
	js: [ 'jsdelivr', 'cdn', 'browser', 'exports' ],
	css: [ 'jsdelivr', 'cdn', 'browser', 'style', 'exports' ],
};

const FALLBACK_FIELDS = {
	js: [ 'main' ],
	css: [ 'main' ],
};

const hasExtension = (filename, extension) => {
	filename = filename.toLowerCase();
	return filename.endsWith(`.${extension}`) || (extension === 'js' && filename.endsWith('.mjs'));
};

const filterFields = (pkg, fields, extension) => {
	return filterFilesByExtension(fields[extension].map(field => pkg[field]), extension).map(file => ({ file }));
};

const filterFilesByExtension = (entries, extension) => {
	return entries.filter(entry => entry && hasExtension(entry, extension));
};

export const fromFields = (pkg, fields = PRIMARY_FIELDS) => {
	return [
		...filterFields(pkg, fields, 'js'),
		...filterFields(pkg, fields, 'css'),
	];
};

export const fromFallbackFields = (fields) => {
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

export const normalizeFields = (pkg) => {
	return _.mapValues(pkg, filename => normalizeFilename(filename));
};

export const normalizeFilename = (filename) => {
	return '/' + filename
		.replace(/^\//, '') // remove leading slash
		.replace(/^[^.]+$/, '$&.js') // assume js extension if there is none
		.replace(/\.min\.(m?js|css)$/i, '.$1') // normalize minified
		.replace(/\.(m?js|css)$/i, '.min.$1'); // convert to minified
};

export const resolve = async (normalizedPkg, sources) => {
	let result = {};
	let fieldValues = Object.values(normalizedPkg);

	for (let source of sources) {
		_.defaults(result, fromFiles(fieldValues, await source()));

		if (isReadyForResponse(result)) {
			return result;
		}
	}

	return result;
};

const responseByExtension = (entries, extension) => {
	return entries.find(entry => hasExtension(entry.file, extension));
};
