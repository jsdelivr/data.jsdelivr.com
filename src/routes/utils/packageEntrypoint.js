const normalizeFilename = (filename) => {
	return '/' + filename
		.replace(/^\//, '') // remove trailing slash
		.replace(/\.min\.(js|css)$/i, '.$1') // normalize minified
		.replace(/\.(js|css)$/i, '.min.$1'); // convert to minified;
};

const buildFileResponse = (file, guessed = false) => ({ file: normalizeFilename(file), guessed });

const buildResponse = (data) => {
	return Object.fromEntries(Object.entries(data).filter(([ , v ]) => v).map(([ k, v ]) => [ k, buildFileResponse(v.file, v.guessed) ]));
};

const readyForResponse = (data) => {
	return data.js && data.style && Object.values(data).find(v => v.source === 'default') === undefined;
};

const responseByType = (files, type, source) => {
	let entry = files.find(e => e.field === type);
	return entry ? { ...buildFileResponse(entry.file), source } : undefined;
};

const responseByExtension = (files, extension, source) => {
	let entry = files.find(e => e.file.endsWith(`.${extension}`));
	return entry ? { ...buildFileResponse(entry.file), source } : undefined;
};

const resolveEntrypoints = (defaults, entries, source = 'default') => {
	let cloned = _.cloneDeep(defaults);
	let alternatives = {
		js: responseByExtension(entries, 'js', source),
		style: responseByType(entries, 'style', source) || responseByExtension(entries, 'css', source),
	};

	if (_.isEmpty(cloned)) {
		return alternatives;
	}

	Object.entries(alternatives).filter(([ , v ]) => v).forEach(([ type, info ]) => {
		let current = cloned[type];

		if (current && current.source !== 'default') {
			return;
		}

		cloned[type] = { ...info, guessed: current ? current.file !== info.file : true };
	});

	return cloned;
};

module.exports = { resolveEntrypoints, readyForResponse, buildResponse };
