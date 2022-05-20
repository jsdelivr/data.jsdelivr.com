let originalIt = it;

global.it = function (title, fn) {
	let originalCallSite = new Error();

	return originalIt.call(this, title, function () {
		global.currentTestTitle = title;

		return Promise.resolve(fn.call(this)).catch((error) => {
			// Remove the first two lines and then anything that comes from utils.js
			let originalStack = originalCallSite.stack.split('\n').slice(2);
			originalStack.splice(0, originalStack.findIndex(line => !line.includes('utils.js')));

			error.stack += `\n\nCondition:\n    currentTestTitle === '${title}'`;
			error.stack += `\n\nTest generated:\n${originalStack.join('\n')}`;
			throw error;
		});
	});
};
