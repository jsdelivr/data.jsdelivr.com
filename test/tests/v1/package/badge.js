const chai = require('chai');
const expect = chai.expect;

const config = require('config');
const server = `http://127.0.0.1:${config.get(`server.port`)}`;

describe('/v1/package/badge', () => {
	it(`GET /v1/package/npm/package-2/badge`, () => {
		return chai.request(server)
			.get(`/v1/package/npm/package-2/badge`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response.body.toString()).to.contain('20k hits/month');
			});
	});

	it(`GET /v1/package/npm/package-2/badge/rank`, () => {
		return chai.request(server)
			.get(`/v1/package/npm/package-2/badge/rank`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response.body.toString()).to.contain('#117');
			});
	});

	it(`GET /v1/package/npm/package-2/badge/type-rank`, () => {
		return chai.request(server)
			.get(`/v1/package/npm/package-2/badge/type-rank`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response.body.toString()).to.contain('#57');
			});
	});
});
