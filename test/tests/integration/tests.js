process.env.NODE_ENV = 'test';
require('../../../src/lib/startup');

const chai = require('chai');
const chaiHttp = require('chai-http');
const nock = require('nock');
const expect = chai.expect; // = require('expect-assert')(chai.expect);

chai.use(chaiHttp);
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

describe('Other', function () {
	this.timeout(10000);

	it('GET /debug/4f5dbb6427b186c054465729f5ed0fc6', () => {
		return chai.request(server)
			.get('/debug/4f5dbb6427b186c054465729f5ed0fc6')
			.then((res) => {
				expect(res).to.have.status(200);
			});
	});

	it('GET /heartbeat', () => {
		return chai.request(server)
			.get('/heartbeat')
			.buffer()
			.then((res) => {
				expect(res).to.have.status(200);
				expect(res.text).to.equal('Awake & Alive');
			});
	});
});

require('./v1');
