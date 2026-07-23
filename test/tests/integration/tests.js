import '../../../src/lib/startup.js';
import nock from 'nock';
import './v1.js';

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

	it('adds discovery links to unmatched responses', () => {
		return chai.request(server)
			.get('/whatever')
			.then((response) => {
				expect(response).to.have.status(400);
				expect(response).to.have.header('Link', '<http://localhost:4454/v1/spec.yaml>; rel="service-desc"; type="application/yaml", <http://localhost:4400/docs/data.jsdelivr.com>; rel="service-doc"; type="text/html"');
			});
	});

	it('does not add discovery links to static files', () => {
		return chai.request(server)
			.get('/favicon.ico')
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).not.to.have.header('Link');
			});
	});
});
