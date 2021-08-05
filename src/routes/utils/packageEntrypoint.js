const normalizeFilename = (filename) => {
	return '/' + filename
		.replace(/^\//, '') // remove trailing slash
		.replace(/\.min\.(js|css)$/i, '.$1') // normalize minified
		.replace(/\.(js|css)$/i, '.min.$1'); // convert to minified;
};

const buildFileResponse = (file, guessed = false) => ({ file: normalizeFilename(file), guessed });

const responseByType = (files, type) => {
	let entry = files.find(e => e.field === type);
	return entry ? buildFileResponse(entry.file) : undefined;
};

const responseByExtension = (files, extension) => {
	let entry = files.find(e => e.file.endsWith(`.${extension}`));
	return entry ? buildFileResponse(entry.file) : undefined;
};

const resolveEntrypoints = (entries) => {
	return {
		js: responseByExtension(entries, 'js'),
		style: responseByType(entries, 'style') || responseByExtension(entries, 'css'),
	};
};

const updateResolved = (defaults, entries) => {
	let alternatives = resolveEntrypoints(entries);

	Object.entries(alternatives).filter(([ , v ]) => v).forEach(([ type, info ]) => {
		let current = defaults[type];
		defaults[type] = { ...info, guessed: current ? current.file !== info.file : true };
	});

	return defaults;
};

module.exports = { resolveEntrypoints, updateResolved };
