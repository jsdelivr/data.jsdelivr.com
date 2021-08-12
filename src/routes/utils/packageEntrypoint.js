const normalizeFilename = (filename) => {
	return '/' + filename
		.replace(/^\//, '') // remove leading slash
		.replace(/\.min\.(js|css)$/i, '.$1') // normalize minified
		.replace(/\.(js|css)$/i, '.min.$1'); // convert to minified
};

const buildFileResponse = (file, guessed = false) => {
	return { file: normalizeFilename(file), guessed };
};

const buildResponse = (entries) => {
	return _.mapValues(_.pickBy(entries), entrypoint => buildFileResponse(entrypoint.file, entrypoint.guessed));
};

const isReadyForResponse = (data) => {
	return data.js && data.style && Object.values(data).every(v => v.source !== 'default');
};

const responseByExtension = (entries, extension, source) => {
	let entry = entries.find(e => e.file.toLowerCase().endsWith(`.${extension.toLowerCase()}`));
	return entry ? { ...buildFileResponse(entry.file), source } : undefined;
};

const responseByType = (entries, type, source) => {
	let entry = entries.find(e => e.field === type);
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

module.exports = { resolveEntrypoints, isReadyForResponse, buildResponse };
