// See https://github.com/mochajs/mocha/blob/master/example/config/.mocharc.js for the full list of options.
process.env.NODE_ENV = 'test';

module.exports = {
	exit: true,
	reporterOption: [ 'maxDiffSize=0' ],
	require: [ './test/setup.js', './test/hooks.js' ],
	spec: [ './test/tests/unit/tests.js', './test/tests/integration/tests.js' ],
};
