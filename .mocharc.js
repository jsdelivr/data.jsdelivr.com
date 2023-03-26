// See https://github.com/mochajs/mocha/blob/master/example/config/.mocharc.js for the full list of options.
module.exports = {
	'exit': true,
	'node-option': 'no-experimental-fetch',
	'reporter-option': [ 'maxDiffSize=0' ],
	'require': [ 'expect-assert/hooks', './test/setup.js', './test/hooks.js' ],
	'spec': [ './test/tests/tests.js' ],
};
