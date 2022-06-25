module.exports = {
	'exit': true,
	'reporter-option': [ 'maxDiffSize=0' ],
	'require': [ 'expect-assert/hooks', './test/setup.js', './test/hooks.js' ],
	'spec': [ './test/tests/tests.js' ],
};
