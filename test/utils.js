const chai = require('chai');
const expect = chai.expect;

const path = require('path');
const urlTemplate = require('url-template');

// based on https://stackoverflow.com/a/43053803
const cartesian = (...sets) => {
	if (sets.length === 1) {
		return sets[0].map(i => [ i ]);
	}

	return sets.reduce((accumulator, currentSet) => {
		return accumulator.flatMap((resultItem) => {
			return currentSet.map(currentSetItem => [ resultItem, currentSetItem ].flat());
		});
	});
};

function getUriWithValues (template, values, defaults) {
	return urlTemplate.parse(template).expand(defaults ? _.defaults(values, defaults) : values);
}

function makeEndpointTest (uriTemplate, defaults, values, { status = 200 } = {}, note) {
	let originalCallSite = new Error();
	let getUri = full => getUriWithValues(uriTemplate, values, full);

	it(`GET ${getUri()}${note ? ` - ${note}` : ''}`, () => {
		return chai.request(server)
			.get(getUri())
			.then((response) => {
				expect(response).to.have.status(status);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.be.json;

				if (status < 400) {
					expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				} else {
					expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				}

				expect(response).to.matchSnapshot(getUri(defaults));
			}).catch((error) => {
				// Stack traces pointing just to this function are not very useful,
				// so we extend them with location of the code that generated the test,
				// and a condition that can be set in debugger for this particular configuration.
				error.stack += `\n\nCondition:\n    getUri() === '${getUri()}'`;
				error.stack += `\n\nTest generated:\n${originalCallSite.stack.split('\n').slice(3).join('\n')}`;
				throw error;
			});
	});
}

function makeEndpointTests (uriTemplate, defaults, testTemplates, options, note) {
	for (let testTemplate of testTemplates) {
		let templateKeys = Object.keys(testTemplate);
		let templateValues = Object.values(testTemplate).map(item => Array.isArray(item) ? item : [ item ]);
		let testCases = cartesian(...templateValues).map(test => _.zipObject(templateKeys, test));

		for (let testValues of testCases) {
			makeEndpointTest(uriTemplate, defaults, testValues, options, note);
		}
	}
}

module.exports = {
	makeEndpointTests,
	setupSnapshots (file) {
		chaiSnapshotInstance.setCurrentFile(path.join(
			__dirname,
			'expected',
			path.relative(path.join(__dirname, 'tests'), path.dirname(file)),
			`${path.basename(file, path.extname(file))}.json`
		));
	},
};
